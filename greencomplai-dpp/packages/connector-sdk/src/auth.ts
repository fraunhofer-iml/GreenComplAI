import { ConnectorAuthError, ConnectorUnavailableError } from "./types.js";

// How a connector authenticates - described declaratively, not as code.
//
// This is the point where the promise "the module can only read" would
// otherwise break. Many APIs, SIMPL included, exchange a token via POST:
// credentials in, short-lived token back. Giving the module a general POST
// capability for that would turn the HTTP client's allowlist into a mere
// suggestion.
//
// So a module describes its login flow instead of executing it. The platform
// runs it - against exactly one path, with exactly the fields declared here.
// A module cannot influence it: it never sees the secret or the token, only
// an HTTP client that is already authenticated.

export type ConnectorAuthSpec =
  | { kind: "none" }
  // A token the operator stores directly. No exchange needed.
  | { kind: "bearer"; secretKey: string }
  // Exchange credentials for a short-lived token (OAuth2 Client Credentials
  // in the shape most providers actually speak - not the one the spec
  // describes).
  | {
      kind: "client-credentials";
      // Relative to the module's base URL. The only path in the whole system
      // that anything other than GET goes to.
      tokenPath: string;
      clientIdKey: string;
      clientSecretKey: string;
      encoding: "form" | "json";
      accessTokenField: string;
      // Expiry as either a point in time (Unix seconds) or a duration.
      // Providers send one or the other; if neither is present, expiry is
      // estimated conservatively.
      expiresAtField?: string;
      expiresInField?: string;
    };

export type AuthorizeOptions = {
  baseUrl: string;
  spec: ConnectorAuthSpec;
  // Configuration values **and** decrypted secrets. This structure never
  // leaves the platform towards the module.
  values: Readonly<Record<string, string>>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
};

// How long before expiry a token is renewed. Without this margin, a call
// starting one second before expiry could arrive with a token that has
// already expired by the time it lands.
const RENEWAL_MARGIN_MS = 60_000;
// Used when the provider names no expiry. Short enough that a revoked token
// is not kept in use indefinitely.
const ASSUMED_LIFETIME_MS = 5 * 60_000;
const DEFAULT_TIMEOUT_MS = 15_000;

export function createAuthorize(
  options: AuthorizeOptions,
): (() => Promise<Record<string, string>>) | undefined {
  const { spec } = options;
  if (spec.kind === "none") return undefined;

  if (spec.kind === "bearer") {
    const token = options.values[spec.secretKey];
    if (!token) {
      throw new ConnectorAuthError(`The connector configuration is missing "${spec.secretKey}"`);
    }

    return async () => ({ authorization: `Bearer ${token}` });
  }

  // Assigned explicitly rather than relying on closure narrowing: the checks
  // above live outside `exchange`, and the type should be stated where it
  // applies.
  const credentials: Extract<ConnectorAuthSpec, { kind: "client-credentials" }> = spec;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? (() => Date.now());
  const base = new URL(options.baseUrl);
  const tokenUrl = new URL(`${base.origin}${credentials.tokenPath}`);

  let cached: { token: string; expiresAt: number } | undefined;
  // Several concurrent calls should trigger one exchange, not five.
  let inFlight: Promise<string> | undefined;

  async function exchange(): Promise<string> {
    const clientId = options.values[credentials.clientIdKey];
    const clientSecret = options.values[credentials.clientSecretKey];
    if (!clientId || !clientSecret) {
      throw new ConnectorAuthError(
        `The connector configuration is missing "${credentials.clientIdKey}" or "${credentials.clientSecretKey}"`,
      );
    }

    const payload = { client_id: clientId, client_secret: clientSecret };
    let response: Response;
    try {
      response = await fetchImpl(tokenUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type":
            credentials.encoding === "json"
              ? "application/json"
              : "application/x-www-form-urlencoded",
        },
        body:
          credentials.encoding === "json"
            ? JSON.stringify(payload)
            : new URLSearchParams(payload).toString(),
        redirect: "manual",
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (error) {
      throw new ConnectorUnavailableError(
        `Could not reach the token endpoint: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ConnectorAuthError(
        "The connected system rejected the stored credentials. Check client id and secret.",
      );
    }
    if (!response.ok) {
      throw new ConnectorUnavailableError(`The token endpoint answered ${response.status}`);
    }

    const body = (await response.json().catch(() => undefined)) as
      Record<string, unknown> | undefined;
    const token = body?.[credentials.accessTokenField];
    if (typeof token !== "string" || token.length === 0) {
      throw new ConnectorUnavailableError(
        `The token endpoint did not return a "${credentials.accessTokenField}"`,
      );
    }

    cached = { token, expiresAt: readExpiry(body ?? {}, credentials, now()) };

    return token;
  }

  return async () => {
    if (cached && cached.expiresAt - RENEWAL_MARGIN_MS > now()) {
      return { authorization: `Bearer ${cached.token}` };
    }

    inFlight ??= exchange().finally(() => {
      inFlight = undefined;
    });

    return { authorization: `Bearer ${await inFlight}` };
  };
}

function readExpiry(
  body: Record<string, unknown>,
  spec: Extract<ConnectorAuthSpec, { kind: "client-credentials" }>,
  issuedAt: number,
): number {
  const at = spec.expiresAtField ? body[spec.expiresAtField] : undefined;
  if (typeof at === "number" && Number.isFinite(at)) return at * 1000;

  const seconds = spec.expiresInField ? body[spec.expiresInField] : undefined;
  if (typeof seconds === "number" && Number.isFinite(seconds)) return issuedAt + seconds * 1000;

  return issuedAt + ASSUMED_LIFETIME_MS;
}
