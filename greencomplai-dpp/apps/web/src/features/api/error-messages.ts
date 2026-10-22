import { m } from "#/paraglide/messages";

import type { ApiMessage } from "./client";

// What a person reads when a request fails.
//
// The API answers with a `Result` envelope: a stable `code` plus a `text`
// (prEN 18222, Table 14). The code is the part of that contract that does not
// move - it survives rewording, and it is the same for every caller. The text
// is one language, chosen by whoever wrote the handler.
//
// So the text people read is looked up by code here, in Paraglide messages, and
// the API's own text is only the fallback. Adding a language then means adding
// `messages/<locale>.json`; neither the API nor any component changes.
//
// **A code earns an entry only when the code alone carries the whole meaning.**
// Most do. Where the API's text also names a value - the identifier that was
// not found, the dictionary key that was taken - the entry drops the value and
// says the rest, because the screen already shows it: the identifier is in the
// search field the person just used, the key in the form one step back. The API
// keeps the value in its own text, where it is read by whoever called the API
// directly.
//
// What has no entry is anything carrying a `path`. A field-level validation
// message says *which* field, and no code can say that - those keep the text
// the API attached to the field.
//
// The case this table cannot serve is a message that needs a fixed wording
// *and* a value the screen does not already have. Then the envelope has to
// carry the value next to the code and this table formats it. That is a change
// to the response shape; worth making when such a message shows up, not before.
//
// Mapped explicitly rather than by deriving a message key from the code:
// a lookup like `m[`error_${code.toLowerCase()}`]` would compile, tree-shake
// nothing, and turn a typo in a code into a silent fallback instead of a build
// error.
const MESSAGES: Record<string, () => string> = {
	CONNECTOR_AUTH_FAILED: m.error_connector_auth_failed,
	CONNECTOR_CAPABILITY_MISSING: m.error_connector_capability_missing,
	CONNECTOR_DISABLED: m.error_connector_disabled,
	CONNECTOR_NOT_FOUND: m.error_connector_not_found,
	CONNECTOR_NOT_INSTALLED: m.error_connector_not_installed,
	CONNECTOR_RATE_LIMITED: m.error_connector_rate_limited,
	// The API's text for this one carries the path and the status the external
	// system answered with: diagnostics for the log, not for the person in front
	// of the screen.
	CONNECTOR_UNAVAILABLE: m.error_connector_unavailable,
	CONNECTOR_ROUTE_FORBIDDEN: m.error_connector_route_forbidden,
	CONNECTOR_SECRET_CORRUPT: m.error_connector_secret_corrupt,
	CONNECTOR_SECRET_KEY_MISSING: m.error_connector_secret_key_missing,
	DICTIONARY_DRAFT_EMPTY: m.error_dictionary_draft_empty,

	// --- Catalogue ------------------------------------------------------------
	DATA_DICTIONARY_REPOSITORY_EXISTS: m.error_dictionary_repository_exists,
	DATA_DICTIONARY_REPOSITORY_NOT_FOUND: m.error_dictionary_repository_not_found,
	EXTERNAL_PRODUCT_NOT_FOUND: m.error_external_product_not_found,
	PRODUCT_NOT_FOUND: m.error_product_not_found,

	// Only ever the page-level case. A validation failure that names a field
	// arrives with a `path` and is filtered out below - "the request was invalid"
	// would be a worse answer than the one the API attached to the input.
	VALIDATION_FAILED: m.error_validation_failed,
};

// The text to show for a failed request.
//
// Three steps, in this order: the message for the code, then what the API said,
// then a sentence that at least states something went wrong. The middle step is
// what keeps a deployed client usable against a newer API - a code this table
// has never heard of still produces the API's own wording rather than a shrug.
export function messageForCode(
	message: ApiMessage | undefined,
	status: number,
): string {
	// A message tied to a field says something its code cannot. Replacing it with
	// the code's wording would answer a different question than the one asked.
	const known =
		message?.code && !message.path ? MESSAGES[message.code] : undefined;

	return known?.() ?? message?.text ?? m.error_request_failed({ status });
}

// Whether a code has a message of its own here. For tests and tooling; the
// application asks `messageForCode`, which answers in every case.
export function hasMessageForCode(code: string): boolean {
	return code in MESSAGES;
}
