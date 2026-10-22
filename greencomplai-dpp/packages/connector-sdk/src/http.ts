import { ConnectorAuthError, ConnectorRateLimitError, ConnectorUnavailableError } from "./types.js";

// The only way a connector module reaches the outside world - and it can only read.
//
// Write calls to the external system must **never** be possible, even if the issued
// credentials would allow them. A credential with write access is the normal case, not the
// exception - many vendors have no read-only credentials at all. So the restriction can't live
// on the credential; it has to live here.
//
// It is therefore not phrased as a rule a module is supposed to follow, but as a shape that
// permits nothing else:
//
//   - There is no method besides GET and HEAD. No `post`, no `request`, no parameter that sets
//     the method.
//   - There is no body. Not "it gets ignored" - there is no field for it.
//   - The path must be on an allowlist. Default is deny, not allow: an endpoint the external
//     system adds tomorrow is unreachable here until someone lists it.
//   - The resolved URL must still be under the base URL afterwards. Otherwise the allowlist
//     could be bypassed via `..` or an encoded slash.
//   - Redirects are not followed. A 302 to another host would otherwise be a way around
//     everything above - including the header carrying the token.
//   - The module cannot set headers. `Accept` is the only exception, and it has no way to
//     override the method.
//
// What this is **not**: a sandbox. A module determined to do so can reach into Node's global
// `fetch`. For the bundled modules that boundary is fine - they're part of the same repository
// and the same review. If third-party modules run here later, that needs its own process with
// an egress proxy; this interface is cut so that step leaves the modules unchanged.

export type AllowedMethod = "GET" | "HEAD";

// An allowed endpoint. `{name}` stands for exactly one path segment - not for arbitrarily many,
// otherwise `/v1/assets/{id}` would also allow `/v1/assets/1/anything/else`.
export type AllowedRoute = {
  method: AllowedMethod;
  path: string;
};

export type ReadOnlyHttpClient = {
  // Throws on any response outside 2xx, including 404.
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  // Like `get`, but returns `undefined` on 404. "Doesn't exist there" is a valid answer when
  // looking up an identifier, not an error.
  tryGet<T>(path: string, options?: RequestOptions): Promise<T | undefined>;
  getBinary(
    path: string,
    options?: RequestOptions,
  ): Promise<{ body: ArrayBuffer; mimeType: string } | undefined>;
};

export type RequestOptions = {
  query?: Record<string, string | number | boolean | undefined>;
  accept?: string;
};

export type OutboundRequestEvent = {
  method: AllowedMethod;
  url: string;
  status?: number;
  durationMs: number;
  error?: string;
};

export type ReadOnlyHttpClientOptions = {
  baseUrl: string;
  allowlist: readonly AllowedRoute[];
  // Supplies the headers that identify a call (typically `Authorization`). Runs **outside**
  // the module: where a vendor requires a POST to fetch the token, that POST happens here, not
  // in module code. The module never sees the secret.
  authorize?: () => Promise<Record<string, string>>;
  // Self-throttling. The other side's limits are its commitment to us, not ours to it -
  // honoring them is cheaper than any fallback strategy.
  rateLimit?: { requestsPerSecond: number; burst: number };
  timeoutMs?: number;
  // Every outbound call is reported. Without this, "which module fetched what and when" is
  // unanswerable after an incident.
  onRequest?: (event: OutboundRequestEvent) => void;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export class ForbiddenRouteError extends Error {
  readonly code = "CONNECTOR_ROUTE_FORBIDDEN";

  constructor(method: string, path: string) {
    super(
      `${method} ${path} is not on this connector's read-only allowlist and was not sent. ` +
        `Only GET and HEAD against explicitly allowed paths are possible.`,
    );
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function createReadOnlyHttpClient(options: ReadOnlyHttpClientOptions): ReadOnlyHttpClient {
  const base = new URL(options.baseUrl);
  // A base path without a trailing slash makes the prefix check below exploitable: `/v1`
  // would also be a prefix of `/v1evil`.
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  const allowed = options.allowlist.map(compileRoute);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const throttle = createThrottle(options);

  async function send(
    method: AllowedMethod,
    path: string,
    requestOptions: RequestOptions,
  ): Promise<Response> {
    const url = resolve(method, path, requestOptions.query, base, basePath, allowed);

    await throttle();

    const headers: Record<string, string> = {
      accept: requestOptions.accept ?? "application/json",
    };
    if (options.authorize) {
      Object.assign(headers, await options.authorize());
    }

    const startedAt = options.now?.() ?? Date.now();
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        // No `body`: the field isn't set to `undefined` - it simply doesn't appear here.
        redirect: "manual",
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.onRequest?.({
        method,
        url: url.toString(),
        durationMs: (options.now?.() ?? Date.now()) - startedAt,
        error: message,
      });
      throw new ConnectorUnavailableError(`Request to ${url.pathname} failed: ${message}`);
    }

    options.onRequest?.({
      method,
      url: url.toString(),
      status: response.status,
      durationMs: (options.now?.() ?? Date.now()) - startedAt,
    });

    // A redirect is rejected, not followed. Following it would hand the destination to the
    // external system - and with it the question of whether the allowlist still applies.
    if (response.status >= 300 && response.status < 400) {
      throw new ConnectorUnavailableError(
        `Refused to follow a ${response.status} redirect from ${url.pathname}`,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new ConnectorAuthError(
        `The stored credentials were rejected (${response.status}). Check the connector configuration.`,
      );
    }
    if (response.status === 429) {
      throw new ConnectorRateLimitError("The connected system is rate limiting this integration.");
    }

    return response;
  }

  async function readJson<T>(response: Response, path: string): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch {
      throw new ConnectorUnavailableError(`${path} did not return valid JSON`);
    }
  }

  return {
    async get<T>(path: string, requestOptions: RequestOptions = {}) {
      const response = await send("GET", path, requestOptions);
      if (!response.ok) {
        throw new ConnectorUnavailableError(`${path} answered ${response.status}`);
      }

      return readJson<T>(response, path);
    },

    async tryGet<T>(path: string, requestOptions: RequestOptions = {}) {
      const response = await send("GET", path, requestOptions);
      if (response.status === 404) return undefined;
      if (!response.ok) {
        throw new ConnectorUnavailableError(`${path} answered ${response.status}`);
      }

      return readJson<T>(response, path);
    },

    async getBinary(path: string, requestOptions: RequestOptions = {}) {
      const response = await send("GET", path, { accept: "*/*", ...requestOptions });
      if (response.status === 404) return undefined;
      if (!response.ok) {
        throw new ConnectorUnavailableError(`${path} answered ${response.status}`);
      }

      return {
        body: await response.arrayBuffer(),
        mimeType: response.headers.get("content-type") ?? "application/octet-stream",
      };
    },
  };
}

type CompiledRoute = { method: AllowedMethod; pattern: RegExp; source: string };

function compileRoute(route: AllowedRoute): CompiledRoute {
  if (!route.path.startsWith("/")) {
    throw new Error(`Allowlist entry "${route.path}" must start with "/"`);
  }

  const pattern = route.path
    .split("/")
    .map((segment) =>
      segment.startsWith("{") && segment.endsWith("}") ? "[^/]+" : escapeRegExp(segment),
    )
    .join("/");

  return { method: route.method, pattern: new RegExp(`^${pattern}$`), source: route.path };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolve(
  method: AllowedMethod,
  path: string,
  query: RequestOptions["query"],
  base: URL,
  basePath: string,
  allowed: readonly CompiledRoute[],
) {
  // Anything that doesn't look like a plain absolute path is rejected immediately, before any
  // URL parser gets a chance to interpret it charitably. `//host` would be protocol-relative,
  // some parsers treat `\` like `/`, and `%2f` would bypass the segment check.
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("..") ||
    /%2f/i.test(path) ||
    path.includes("?") ||
    path.includes("#")
  ) {
    throw new ForbiddenRouteError(method, path);
  }

  if (!allowed.some((route) => route.method === method && route.pattern.test(path))) {
    throw new ForbiddenRouteError(method, path);
  }

  const url = new URL(`${base.origin}${path}`);

  // Check what's actually being addressed again after resolving. The allowlist saw the path
  // the module wrote; this check sees the one about to be sent.
  if (url.origin !== base.origin || !`${url.pathname}/`.startsWith(basePath)) {
    throw new ForbiddenRouteError(method, path);
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return url;
}

// Token bucket. Sufficient for what's needed here: a steady rate with an allowed burst, without
// a background timer.
function createThrottle(options: ReadOnlyHttpClientOptions): () => Promise<void> {
  const limit = options.rateLimit;
  if (!limit) return async () => {};

  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  let tokens = limit.burst;
  let lastRefill = now();
  // Calls queue up one after another. Without this chain, ten concurrent calls would all see
  // the same tokens and jointly defeat the throttling.
  let queue: Promise<void> = Promise.resolve();

  const acquire = async () => {
    for (;;) {
      const current = now();
      tokens = Math.min(
        limit.burst,
        tokens + ((current - lastRefill) / 1000) * limit.requestsPerSecond,
      );
      lastRefill = current;

      if (tokens >= 1) {
        tokens -= 1;
        return;
      }

      await sleep(Math.ceil(((1 - tokens) / limit.requestsPerSecond) * 1000));
    }
  };

  return () => {
    const next = queue.then(acquire);
    queue = next.catch(() => {});
    return next;
  };
}
