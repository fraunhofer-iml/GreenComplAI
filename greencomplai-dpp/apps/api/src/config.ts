import { z } from "zod";

const envSchema = z.object({
  // When false (the default for self-hosted), only users with a pending
  // invitation may register; open self-service signup is reserved for the SaaS
  // onboarding flow. Enforced via a Better Auth create hook, not just the UI.
  ALLOW_OPEN_SIGNUP: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  API_ORIGIN: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(16).default("local-development-secret-change-me"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().default("postgres://dpp:dpp@localhost:5432/dpp"),
  // Selects deployment behavior at the edges (registration, entitlements,
  // tenant lifecycle). The core domain is identical in both modes.
  DEPLOYMENT_MODE: z.enum(["self-hosted", "saas"]).default("self-hosted"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  // Rate limiting protects against mass extraction / credential stuffing
  // (prEN 18239 5.2 no. 12/16). Disable only for tests; the allowlist exempts
  // trusted callers (e.g. authorities / regulated integrations) by client IP.
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  RATE_LIMIT_ALLOWLIST: z.string().optional(),
  // Background worker (pg-boss). Off by default: a second API replica must not
  // run the jobs a second time, so an operator opts one process in.
  WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // Cron for the orphan sweep; default 03:17 daily (off the hour, where every
  // other cron in the world piles up).
  BLOB_CLEANUP_CRON: z.string().default("17 3 * * *"),
  // How long an unreferenced upload is kept before it is swept. Must comfortably
  // exceed how long an editor may sit on an unsaved draft.
  BLOB_ORPHAN_GRACE_HOURS: z.coerce.number().int().positive().default(48),
  // Key used to encrypt installed connectors' credentials (base64, 32 bytes -
  // `openssl rand -base64 32`). Without it, a connector with a secret cannot
  // be installed at all; that is deliberate. Making it optional and falling
  // back to plaintext storage would trade a real safeguard for convenience.
  CONNECTOR_SECRET_KEY: z.string().optional(),
  // Optional ClamAV (clamd) for upload scanning. Without CLAMAV_HOST the
  // signature checks in file-inspection.ts are the only barrier.
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
  CLAMAV_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  // Fail closed when the scanner is missing or unreachable. Off by default so a
  // self-hosted instance without ClamAV still accepts uploads; a regulated
  // deployment should turn this on.
  CLAMAV_REQUIRED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // Parent domain the session cookie is widened to, e.g. ".example.com", when
  // the frontend runs on a sibling subdomain of the API. Every host under it
  // receives the cookie, so keep it as narrow as the deployment allows. Unset
  // means a host-only cookie.
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  // Shown in the user's authenticator app next to the code.
  TWO_FACTOR_ISSUER: z.string().default("DPP Platform"),
  // When true, admins must have a verified second factor before they can use
  // administrative endpoints (prEN 18239 5.2 no. 18-22). Off by default so an
  // existing instance does not lock its admins out on upgrade.
  REQUIRE_ADMIN_TWO_FACTOR: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // Mail delivery is optional: without SMTP_HOST an invitation still works, the
  // admin just hands the link over instead. Configured, invitations are mailed.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default("DPP Platform <noreply@localhost>"),
  S3_ACCESS_KEY_ID: z.string().default("minio"),
  S3_BUCKET: z.string().default("dpp"),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  // The endpoint presigned download URLs are signed against. Defaults to
  // S3_ENDPOINT; set it where the API reaches storage on an internal address the
  // browser cannot resolve.
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("local"),
  S3_SECRET_ACCESS_KEY: z.string().default("minio123"),
  // Uploads are streamed through the API rather than written straight to S3 via
  // a presigned PUT: only that way can size, MIME type and content sniffing be
  // enforced authoritatively, and the checksum computed from the bytes we
  // actually stored (prEN 18239 5.2 no. 11/16).
  UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(25 * 1024 * 1024),
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default(
      "application/pdf,image/png,image/jpeg,image/webp,text/csv,text/plain,application/xml,text/xml,application/json",
    ),
  // Downloads hand out short-lived presigned URLs instead of proxying bytes:
  // the TTL bounds how long a leaked link stays usable.
  DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(300),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  WEB_ORIGINS: z.string().optional(),
  // Points a connector module at a different host than its manifest names, so a
  // local mock can stand in for the real system during development. Format:
  // `simpl=http://localhost:4010`, comma-separated for several modules.
  //
  // Refused in production, and not as a formality. A module's base URL is the
  // one host its stored credentials are ever sent to; that is why the manifest
  // fixes it and no tenant setting can move it. This switch is a different
  // thing: it belongs to whoever runs the process, and that is the same person
  // who already decides which modules exist at all.
  CONNECTOR_BASE_URL_OVERRIDES: z.string().optional(),
});

// Insecure development defaults that must never be used in production. Declared
// above the call below: the function is hoisted, this const is not, so with the
// declaration further down the production check crashed on an undefined object
// instead of running.
const INSECURE_DEFAULTS: Record<string, string[]> = {
  BETTER_AUTH_SECRET: ["local-development-secret-change-me", "replace-with-a-long-random-secret"],
  DATABASE_URL: ["postgres://dpp:dpp@localhost:5432/dpp"],
  S3_ACCESS_KEY_ID: ["minio"],
  S3_SECRET_ACCESS_KEY: ["minio123"],
};

const parsedEnv = envSchema.parse(process.env);

assertProductionSecrets(process.env);

const connectorBaseUrlOverrides = parseConnectorBaseUrls(
  parsedEnv.CONNECTOR_BASE_URL_OVERRIDES,
  parsedEnv.NODE_ENV,
);

export const env = {
  ...parsedEnv,
  S3_PUBLIC_ENDPOINT: parsedEnv.S3_PUBLIC_ENDPOINT ?? parsedEnv.S3_ENDPOINT,
  WEB_ORIGINS: parseOrigins(parsedEnv.WEB_ORIGINS, parsedEnv.WEB_ORIGIN),
  UPLOAD_ALLOWED_MIME_TYPES: new Set(
    parsedEnv.UPLOAD_ALLOWED_MIME_TYPES.split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  ),
  RATE_LIMIT_ALLOWLIST: new Set(
    (parsedEnv.RATE_LIMIT_ALLOWLIST ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  ),
  CONNECTOR_BASE_URL_OVERRIDES: connectorBaseUrlOverrides,
};

export function assertProductionSecrets(values: NodeJS.ProcessEnv) {
  if (values.NODE_ENV !== "production") return;

  const offending = Object.entries(INSECURE_DEFAULTS)
    .filter(([key, insecure]) => {
      const raw = values[key]?.trim();
      // Reject if unset (default would apply) or still set to the dev default.
      return !raw || insecure.includes(raw);
    })
    .map(([key]) => key);

  if (offending.length > 0) {
    throw new Error(
      `Refusing to start in production: the following secrets are missing or use insecure development defaults: ${offending.join(", ")}. Set explicit values via environment variables.`,
    );
  }
}

// `simpl=http://localhost:4010,other=http://localhost:4011` into a map.
//
// Every value is parsed as a URL rather than taken as a string: a typo here does
// not produce a connector that talks to a slightly wrong host, it produces a
// process that does not start.
export function parseConnectorBaseUrls(
  value: string | undefined,
  nodeEnv: "development" | "test" | "production",
): Map<string, string> {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) return new Map();

  if (nodeEnv === "production") {
    throw new Error(
      "Refusing to start in production: CONNECTOR_BASE_URL_OVERRIDES redirects a connector's traffic, including its credentials, to a host its manifest does not name. It exists for local mocks during development.",
    );
  }

  const overrides = new Map<string, string>();
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    const key = separator === -1 ? "" : entry.slice(0, separator).trim();
    const url = separator === -1 ? "" : entry.slice(separator + 1).trim();
    if (!key || !url) {
      throw new Error(`CONNECTOR_BASE_URL_OVERRIDES: "${entry}" is not a "connectorKey=url" pair.`);
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`CONNECTOR_BASE_URL_OVERRIDES: "${url}" is not a URL.`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`CONNECTOR_BASE_URL_OVERRIDES: "${url}" is not an http(s) URL.`);
    }

    overrides.set(key, parsed.origin);
    console.warn(
      `[connector] ${key} points at ${parsed.origin} instead of the host in its manifest (CONNECTOR_BASE_URL_OVERRIDES).`,
    );
  }

  return overrides;
}

function parseOrigins(value: string | undefined, fallback: string) {
  const origins = value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins?.length ? origins : [fallback];
}
