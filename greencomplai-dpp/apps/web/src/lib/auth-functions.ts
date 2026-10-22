import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { resolveApiOrigin } from "#/lib/api-origin";

const apiOrigin = resolveApiOrigin();

// VITE_API_ORIGIN is the origin a *browser* uses, and that is not always one the
// SSR server can call: in a container deployment the API may sit on an internal
// address, behind a gateway whose certificate the container has no reason to
// trust. API_ORIGIN_INTERNAL overrides the origin for server-side calls only.
// Read through globalThis so the expression is harmless if it ever ends up in a
// client bundle, where `process` does not exist.
function serverApiOrigin() {
	return globalThis.process?.env?.API_ORIGIN_INTERNAL ?? apiOrigin;
}

export type AuthSession = {
	session: {
		expiresAt: string | Date;
		id: string;
		userId: string;
	};
	user: {
		email: string;
		id: string;
		image?: string | null;
		name: string;
	};
};

export const getAuthSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const requestHeaders = getRequestHeaders();
		const forwardedHeaders = new Headers();

		const cookie = requestHeaders.get("cookie");
		if (cookie) forwardedHeaders.set("cookie", cookie);

		const authorization = requestHeaders.get("authorization");
		if (authorization) forwardedHeaders.set("authorization", authorization);

		const response = await fetch(`${serverApiOrigin()}/api/auth/get-session`, {
			credentials: "include",
			headers: forwardedHeaders,
		});

		if (!response.ok) return null;

		return response.json() as Promise<AuthSession | null>;
	},
);

// Route guards run beforeLoad on every navigation *and* on every hover-preload,
// and TanStack Router has no staleness check for beforeLoad (preloadStaleTime
// only gates loaders). Calling the server function directly therefore produced
// one /api/auth/get-session roundtrip per hover over a nav link, so the session
// goes through the router's QueryClient instead.
//
// The QueryClient is created per request on the server (see
// integrations/tanstack-query/root-provider), so this never shares a session
// between users. On the client it lives for one page load; sign-in and sign-out
// both do a full document navigation, so no auth transition can be cached over.
export const authSessionQueryOptions = queryOptions({
	queryFn: () => getAuthSession(),
	queryKey: ["auth", "session"] as const,
	// Long enough to absorb hover bursts, short enough that a route guard
	// notices a revoked session quickly. Note the guard is UX, not the security
	// boundary -- the API authorises every request itself.
	staleTime: 60_000,
});

function ensureAuthSession(queryClient: QueryClient) {
	// revalidateIfStale keeps this a cache read: past staleTime it still returns
	// the cached session immediately and refreshes in the background, so a hover
	// never blocks on the network.
	return queryClient.ensureQueryData({
		...authSessionQueryOptions,
		revalidateIfStale: true,
	});
}

export async function requireAuthSession(
	queryClient: QueryClient,
	redirectTo: string,
) {
	const session = await ensureAuthSession(queryClient);
	if (!session) {
		throw redirectToLogin(redirectTo);
	}

	return session;
}

export function getCachedAuthSession(queryClient: QueryClient) {
	return ensureAuthSession(queryClient);
}

function redirectToLogin(redirectTo: string) {
	return redirect({
		search: { redirect: redirectTo },
		to: "/login",
	});
}
