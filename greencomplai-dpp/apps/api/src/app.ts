import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Hono } from "hono";

import { auth } from "./auth.js";
import { env } from "./config.js";
import { attachApiKeyContext } from "./http/api-key-auth.js";
import {
  attachAuthContext,
  enforceApiKeyScope,
  requireAuth,
  requireOrganizationMembership,
  type AppBindings,
} from "./http/context.js";
import { buildOpenApiDocument } from "./http/openapi.js";
import { API_VERSION_PREFIX, UNVERSIONED_SUNSET } from "./http/openapi-catalog.js";
import { rateLimit } from "./http/rate-limit.js";
import { createNormFacade, NORM_FACADE_PREFIX } from "./routes/norm-facade.js";
import { blobRoutes } from "./routes/blobs.js";
import { catalogRoutes } from "./routes/catalog.js";
import { connectorRoutes } from "./routes/connectors.js";
import { dppRoutes } from "./routes/dpps.js";
import { healthRoutes } from "./routes/health.js";
import { memberRoutes } from "./routes/members.js";
import { organizationRoutes } from "./routes/organizations.js";
import { publicRoutes } from "./routes/public.js";
import { serviceAccountRoutes } from "./routes/service-accounts.js";

// The wired application, without the server that listens on a port. Kept apart
// from index.ts so tests can drive the real middleware chain through app.fetch()
// instead of asserting against a mock of it.
export const app = new Hono<AppBindings>();

app.use(logger());
app.use(
  "*",
  cors({
    origin: env.WEB_ORIGINS,
    allowHeaders: ["Content-Type", "Authorization", "x-organization-id"],
    // PUT belongs here since the DPP status became a resource that gets set.
    // Omitting a method here does not fail loudly: the preflight still answers
    // 204, and the browser silently refuses to send the actual request. The
    // in-process API tests cannot see this — they call app.fetch() directly and
    // never go through a browser's CORS enforcement.
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Without exposeHeaders a browser client cannot see the deprecation headers -
    // a deprecation visible only in the terminal never reaches the people it
    // concerns.
    exposeHeaders: ["Deprecation", "Sunset", "Link"],
    credentials: true,
  }),
);

// The versioned surface is `/v1`. The unversioned paths keep answering the
// same requests - but from here on they carry their deprecation with them:
// `Deprecation` and a `Sunset` date (RFC 8594/9745) plus a link to the
// successor path. A sunset without a date would be a sentiment, not a
// commitment.
//
// Why keep both at all: the frontend and the pilot speak the unversioned
// paths. Turning them off the moment `/v1` ships would be a gratuitous
// breaking change - the sunset window is the trade-off that makes shipping
// `/v1` possible without one.
const AUTH_PREFIX = "/api/auth";
const sunsetHeader = new Date(UNVERSIONED_SUNSET).toUTCString();

app.use("*", async (c, next) => {
  await next();

  const path = c.req.path;
  if (path.startsWith(`${API_VERSION_PREFIX}/`) || path.startsWith(AUTH_PREFIX)) return;

  c.header("Deprecation", "true");
  c.header("Sunset", sunsetHeader);
  c.header("Link", `<${env.API_ORIGIN}${API_VERSION_PREFIX}${path}>; rel="successor-version"`);
});

// Describes the versioned surface, built from the same Zod schemas the
// endpoints use - no third copy of the same fact.
const openApiDocument = buildOpenApiDocument();
app.get("/openapi.json", (c) => c.json(openApiDocument));
app.get(`${API_VERSION_PREFIX}/openapi.json`, (c) => c.json(openApiDocument));

// Every route group mounts under both prefixes - in one place, so a new group
// cannot accidentally become reachable under only one of them.
// `any` here is deliberate: some subgroups are bound to AppBindings (tenant
// context) and some are not (public surface, health) - `route()` accepts
// both, and no common type exists.
// biome-ignore lint/suspicious/noExplicitAny: see above
function mount(routes: Hono<any>) {
  app.route("/", routes);
  app.route(API_VERSION_PREFIX, routes);
}

// Health/readiness probes are registered before the limiter so they are never
// throttled.
mount(healthRoutes);

// Per-IP rate limiting. A generous global cap bounds total traffic; stricter
// tiers protect the credential-submitting and unauthenticated public surfaces.
// The strict tier targets sign-in/sign-up only — NOT the whole /api/auth/*
// surface — so frequent session-polling (get-session) does not exhaust the
// login budget and lock users out.
app.use("*", rateLimit({ windowMs: 60_000, limit: 600, keyPrefix: "global" }));
app.use(
  "/api/auth/sign-in/*",
  rateLimit({ windowMs: 60_000, limit: 30, keyPrefix: "auth-signin" }),
);
app.use(
  "/api/auth/sign-up/*",
  rateLimit({ windowMs: 60_000, limit: 15, keyPrefix: "auth-signup" }),
);
app.use("/public/*", rateLimit({ windowMs: 60_000, limit: 180, keyPrefix: "public" }));
app.use(
  `${API_VERSION_PREFIX}/public/*`,
  rateLimit({ windowMs: 60_000, limit: 180, keyPrefix: "public" }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

mount(publicRoutes);

// API key first, then session: a call carries exactly one of the two, and the
// key sets the same context fields. An invalid key does not reject the
// request but lets it continue without an identity - otherwise a client that
// accidentally sends a stale key could no longer fall back to its session.
app.use("*", attachApiKeyContext);
app.use("*", attachAuthContext);
app.use("*", requireAuth);

// Organization management (list/create) requires auth but not membership in a
// specific tenant.
mount(organizationRoutes);

// All routes below operate within a single tenant: require verified membership.
app.use("*", requireOrganizationMembership);
// The scope applies **in addition to** the role gate, not instead of it: the
// role says what the account may do, the scope says which part of that this
// key may exercise. Both must agree.
app.use("*", enforceApiKeyScope);
mount(blobRoutes);
mount(catalogRoutes);
mount(connectorRoutes);
mount(dppRoutes);
mount(memberRoutes);
mount(serviceAccountRoutes);

// The norm facade last of all: it delegates to this same app, so the internal
// routes must already be registered. It is **not** wired through `mount`,
// because it brings its own versioning (`/en18222/v1`) and has nothing to do
// with the deprecation of the unversioned surface.
app.route(NORM_FACADE_PREFIX, createNormFacade(app));
