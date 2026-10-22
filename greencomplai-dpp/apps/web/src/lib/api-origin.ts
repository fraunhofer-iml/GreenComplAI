import { env } from "#/env";

// The server injects the browser-facing API origin before client modules run.
// Keep one image portable across installations without rewriting Nitro assets,
// whose Content-Length and ETag metadata is fixed at build time.
// VITE_API_ORIGIN remains the development/build-time fallback.
declare global {
	// eslint-disable-next-line no-var
	var __DPP_API_ORIGIN__: string | undefined;
}

export function resolveApiOrigin(): string {
	return (
		globalThis.__DPP_API_ORIGIN__ ??
		env.VITE_API_ORIGIN ??
		"http://localhost:3000"
	);
}

// Use the same injected origin during SSR and hydration.
export function apiOriginForDocument(): string {
	if (import.meta.env.SSR) {
		return globalThis.process?.env?.API_ORIGIN ?? "";
	}
	return globalThis.__DPP_API_ORIGIN__ ?? "";
}
