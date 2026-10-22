import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { simplConnector } from "../index.js";
import { ASSETS, PARTS } from "./fixtures.js";
import { assertNoDrift, MOCK_ROUTES, notFound, route, type Reply } from "./routes.js";

// A stand-in for api.simpltech.de, for development.
//
// The point is not to simulate SIMPL. It is to make the parts of the platform
// that otherwise only run against a real ERP - the lookup, the field mapping,
// the dictionary draft, the document download - exercisable without one.
// Pointing a developer at a production system to try out a wizard is how test
// imports end up in someone's real catalogue.
//
// Credentials are checked, and wrong ones are rejected. A mock that hands a
// token to anything that asks turns "test connection" into a test of whether
// this process is running, and the one case where that button earns its place,
// a typo in the client secret, would never show up in development.

const PORT = Number(process.env.SIMPL_MOCK_PORT ?? 4010);
const CLIENT_ID = process.env.SIMPL_MOCK_CLIENT_ID ?? "dev-client";
const CLIENT_SECRET = process.env.SIMPL_MOCK_CLIENT_SECRET ?? "dev-secret";
const TOKEN = "mock-access-token";
const TOKEN_LIFETIME_SECONDS = 3600;

const server = createServer((request, response) => {
  handle(request, response).catch((error: unknown) => {
    console.error("[simpl-mock] handler failed", error);
    reply(response, { body: { error: "mock_failure" }, status: 500 });
  });
});

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
  const method = request.method ?? "GET";
  console.info(`[simpl-mock] ${method} ${url.pathname}${url.search}`);

  const tokenPath =
    simplConnector.manifest.auth.kind === "client-credentials"
      ? simplConnector.manifest.auth.tokenPath
      : undefined;
  if (method === "POST" && url.pathname === tokenPath) {
    return authenticate(request, response);
  }

  const matched = route(method, url);
  if (!matched) return reply(response, notFound);

  // `tryGet` turns a 404 into `undefined` but a 401 into an auth error, so the
  // order matters: an unauthenticated call must not look like a missing record.
  if (!authorized(request))
    return reply(response, { body: { error: "unauthorized" }, status: 401 });

  const handler = MOCK_ROUTES.find((entry) => entry.path === matched.path)!;

  return reply(response, handler.handle(matched.params, url));
}

async function authenticate(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const form = new URLSearchParams(await readBody(request));

  if (form.get("client_id") !== CLIENT_ID || form.get("client_secret") !== CLIENT_SECRET) {
    return reply(response, { body: { error: "invalid_client" }, status: 401 });
  }

  reply(response, {
    body: {
      access_token: TOKEN,
      expires_at: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
      token_type: "Bearer",
    },
    status: 200,
  });
}

function authorized(request: IncomingMessage): boolean {
  return request.headers.authorization === `Bearer ${TOKEN}`;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function reply(response: ServerResponse, { body, contentType, status }: Reply): void {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": contentType ?? "application/json",
    "content-length": String(payload.length),
  });
  response.end(payload);
}

assertNoDrift();

server.listen(PORT, () => {
  console.info(`[simpl-mock] listening on http://localhost:${PORT}`);
  console.info(`[simpl-mock] client id "${CLIENT_ID}", client secret "${CLIENT_SECRET}"`);
  console.info(
    `[simpl-mock] point the API at it with CONNECTOR_BASE_URL_OVERRIDES=simpl=http://localhost:${PORT}`,
  );
  console.info(`[simpl-mock] assets: ${ASSETS.map((asset) => asset.externalId).join(", ")}`);
  console.info(`[simpl-mock] parts:  ${PARTS.map((part) => part.externalId).join(", ")}`);
});
