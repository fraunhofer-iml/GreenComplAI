import { SIMPL_ALLOWLIST } from "../index.js";
import { ASSET_TYPES, ASSETS, ORGANIZATIONS, PARTS, RESOURCES } from "./fixtures.js";

// What the mock answers, and the check that it may.
//
// Separate from the server so it can be read and tested without a socket: the
// interesting part here is not the HTTP, it is which paths exist and that they
// are the ones the module is allowed to call.

export type Reply = { body: Buffer | unknown; contentType?: string; status: number };

export const notFound: Reply = { body: { error: "not_found" }, status: 404 };

// The routes, in the notation the manifest's allowlist uses. Keeping the two in
// the same shape is what lets `assertNoDrift` compare them at startup: a mock
// that answers a path the module may not call is a mock that hides a broken
// allowlist until someone runs against the real system.
export const MOCK_ROUTES: { handle: (params: string[], url: URL) => Reply; path: string }[] = [
  { path: "/v1/assets/{id}", handle: ([id], url) => asset(id!, url) },
  { path: "/v1/asset-types/{id}", handle: ([id]) => found(ASSET_TYPES.find((e) => e.id === id)) },
  { path: "/v1/parts/by-external-id", handle: (_params, url) => part(url) },
  {
    path: "/v1/organizations/{id}",
    handle: ([id]) => found(ORGANIZATIONS.find((e) => e.id === id)),
  },
  { path: "/v1/resources/{id}/file", handle: ([id]) => file(id!) },
];

// `?externalId=true` decides which identifier is meant. The module tries the
// external one first and the internal one after, so a mock that ignored the
// flag would answer both attempts and hide a wrong lookup order.
function asset(id: string, url: URL): Reply {
  const byExternalId = url.searchParams.get("externalId") === "true";

  return found(ASSETS.find((entry) => (byExternalId ? entry.externalId === id : entry.id === id)));
}

function part(url: URL): Reply {
  const id = url.searchParams.get("id");

  return found(PARTS.find((entry) => entry.externalId === id || entry.id === id));
}

function file(id: string): Reply {
  const resource = RESOURCES[id];
  if (!resource) return notFound;

  return { body: resource.body, contentType: resource.contentType, status: 200 };
}

function found(value: unknown): Reply {
  return value ? { body: value, status: 200 } : notFound;
}

export function route(method: string, url: URL): { params: string[]; path: string } | undefined {
  if (method !== "GET") return undefined;

  const segments = url.pathname.split("/").filter(Boolean);
  for (const candidate of MOCK_ROUTES) {
    const pattern = candidate.path.split("/").filter(Boolean);
    if (pattern.length !== segments.length) continue;

    const params: string[] = [];
    const matches = pattern.every((part, index) => {
      const segment = decodeURIComponent(segments[index]!);
      if (part.startsWith("{")) {
        params.push(segment);

        return true;
      }

      return part === segment;
    });

    if (matches) return { params, path: candidate.path };
  }

  return undefined;
}

// Every path this mock answers must be one the module is allowed to call. The
// check runs at startup rather than in a test alone: a mock started by hand is
// the situation where the drift would otherwise go unnoticed.
export function assertNoDrift(): void {
  const allowed = new Set(
    SIMPL_ALLOWLIST.filter((entry) => entry.method === "GET").map((entry) => entry.path),
  );
  const extra = MOCK_ROUTES.filter((entry) => !allowed.has(entry.path)).map((entry) => entry.path);
  if (extra.length > 0) {
    throw new Error(
      `The mock answers paths the SIMPL module may not call: ${extra.join(", ")}. Either the allowlist lost an entry or the mock grew one.`,
    );
  }

  const missing = [...allowed].filter((path) => !MOCK_ROUTES.some((entry) => entry.path === path));
  if (missing.length > 0) {
    console.warn(
      `[simpl-mock] the module may call these, but the mock does not answer them: ${missing.join(", ")}`,
    );
  }
}
