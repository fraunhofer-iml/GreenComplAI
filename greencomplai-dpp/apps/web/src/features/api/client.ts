import {
	getActiveOrganizationId,
	setActiveOrganizationId,
} from "#/features/organization/organization-store";
import { resolveApiOrigin } from "#/lib/api-origin";

import { messageForCode } from "./error-messages";

export const apiOrigin = resolveApiOrigin();

type RequestOptions = {
	body?: unknown;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

// One message out of the API's Result envelope (prEN 18222 Table 14).
export type ApiMessage = {
	code?: string;
	messageType: "Info" | "Warning" | "Error" | "Exception";
	// Dotted field path for validation messages, so a form can show the message
	// at the input that caused it.
	path?: string;
	text: string;
	timestamp?: string;
};

// Carries what the server actually said instead of discarding it. The old client
// threw `API request failed (400)` for every failure, so a user was told nothing
// and a developer had to open the network tab to learn the reason .
export class ApiError extends Error {
	readonly messages: ApiMessage[];
	readonly status: number;

	constructor(status: number, messages: ApiMessage[]) {
		// Resolved once, here, rather than at each of the places that render an
		// error: the mapping from code to wording is the same everywhere, and a
		// component that forgot to ask would silently show the API's language.
		// `messages` stays untouched for anything that needs what was actually
		// sent - field errors, logs, a bug report.
		super(messageForCode(messages[0], status));
		this.name = "ApiError";
		this.status = status;
		this.messages = messages;
	}

	get code(): string | undefined {
		return this.messages[0]?.code;
	}

	// Validation messages keyed by field, for form rendering. A field with several
	// complaints keeps all of them.
	fieldErrors(): Record<string, string[]> {
		const errors: Record<string, string[]> = {};
		for (const message of this.messages) {
			if (!message.path) continue;
			const bucket = errors[message.path];
			if (bucket) {
				bucket.push(message.text);
			} else {
				errors[message.path] = [message.text];
			}
		}

		return errors;
	}
}

async function readMessages(response: Response): Promise<ApiMessage[]> {
	// A failure that is not the envelope (a proxy's 502 page, a crash before the
	// error handler) must still produce something a user can read.
	const fallback: ApiMessage[] = [
		{
			messageType: response.status >= 500 ? "Exception" : "Error",
			text: `Die Anfrage ist fehlgeschlagen (${response.status}).`,
		},
	];

	try {
		const payload = (await response.json()) as { messages?: ApiMessage[] };
		return payload.messages?.length ? payload.messages : fallback;
	} catch {
		return fallback;
	}
}

// A tenant-scoped request without a tenant is answered with 400, so no such
// request may leave here. Nothing used to guarantee that: the selection lives in
// localStorage, the user menu only ever displayed the first organization without
// storing it, and a user arriving with an empty localStorage got 400 on every
// scoped endpoint with no way out. Adopting the first membership cannot happen in
// a route guard either - after sign-in the app does a full document navigation,
// so the guard for that first route runs during SSR, where there is no
// localStorage, and is not re-run on hydration.
//
// The lookup is single-flight and asks the API directly rather than through
// apiRequest, which would recurse. It only runs while nothing is selected.
let organizationLookup: Promise<string> | null = null;

async function resolveOrganizationId(): Promise<string> {
	const active = getActiveOrganizationId();
	if (active) return active;

	organizationLookup ??= (async () => {
		try {
			const response = await fetch(`${apiOrigin}/organizations`, {
				credentials: "include",
			});
			if (!response.ok) return "";
			const payload = (await response.json()) as {
				organizations?: { id: string }[];
			};
			const first = payload.organizations?.[0]?.id ?? "";
			if (first) setActiveOrganizationId(first);
			return first;
		} catch {
			return "";
		} finally {
			// Not cached across attempts: a failure here is usually transient, and
			// pinning it would leave the session stuck without a tenant.
			organizationLookup = null;
		}
	})();

	return organizationLookup;
}

export async function apiRequest<T>(
	path: string,
	options: RequestOptions = {},
) {
	const response = await fetch(`${apiOrigin}${path}`, {
		method: options.method ?? "GET",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			// Scope the request to the user's currently selected organization.
			"x-organization-id": await resolveOrganizationId(),
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	});

	if (!response.ok) {
		throw new ApiError(response.status, await readMessages(response));
	}

	return response.json() as Promise<T>;
}

// The anonymous surface: no cookie, no organization header, but the same error
// handling - so a caller does not have to know which route it asked through in
// order to know what to catch.
export async function publicRequest<T>(path: string): Promise<T> {
	const response = await fetch(`${apiOrigin}${path}`);
	if (!response.ok) {
		throw new ApiError(response.status, await readMessages(response));
	}

	return response.json() as Promise<T>;
}

export function buildQuery(
	params: Record<string, string | number | undefined>,
) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") query.set(key, String(value));
	}

	return query.toString() ? `?${query.toString()}` : "";
}
