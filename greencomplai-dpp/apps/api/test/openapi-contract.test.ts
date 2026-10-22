import { describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { API_VERSION_PREFIX, operations } from "../src/http/openapi-catalog.js";
import { NORM_FACADE_PREFIX } from "../src/routes/norm-facade.js";
import { buildOpenApiDocument } from "../src/http/openapi.js";
import { anonymous, createOrganization } from "./helpers/client.js";

// A hand-maintained OpenAPI document is a third copy of the same fact - after
// the handler and the schema - and the first to go stale. This document is
// built from the Zod schemas the endpoints actually use; only the path ->
// schema mapping is written by hand.
//
// This test holds exactly that mapping against reality: against the routes
// Hono has registered. A new route without a catalogue entry fails it, and so
// does a catalogue entry without a route. Without this check the document
// would just be a nicer-formatted claim.

// What Hono actually registered, excluding the Better Auth wildcard (a
// foreign handler with its own surface, not described here) and the `ALL`
// entries that come from `app.use()`.
function registeredRoutes(): Set<string> {
  const routes = new Set<string>();
  for (const route of app.routes) {
    if (route.method === "ALL") continue;
    if (route.path.startsWith("/api/auth")) continue;
    if (route.path.startsWith(API_VERSION_PREFIX)) continue;
    // The norm facade has its own surface and its own document (the paths come
    // from EN 18222 tables 17/19, not our REST cut). It is checked below
    // against its own catalogue.
    if (route.path.startsWith(NORM_FACADE_PREFIX)) continue;
    routes.add(`${route.method.toLowerCase()} ${route.path}`);
  }

  return routes;
}

// What the facade must offer is defined by the norm, not our catalogue. This
// list is a transcript of tables 17 and 19; keeping it here means a missing
// or renamed route gets noticed instead of silently disappearing.
const NORM_OPERATIONS = [
  // Table 17 - lifecycle API
  "get /dpps/:dppId", // ReadDPPById
  "get /dppsByProductId/:productId", // ReadDPPByProductId
  "get /dppsByProductIdAndDate/:productId", // ReadDPPVersionByProductIdAndDate
  "post /dppsByProductIds", // ReadDPPIdsByProductIds
  "post /dpps", // CreateDPP
  "patch /dpps/:dppId", // UpdateDPP
  "delete /dpps/:dppId", // DeleteDPPById
  // Table 19 - fine-grained lifecycle API
  "get /dpps/:dppId/collections/:collectionId", // ReadDataElementCollection
  "get /dpps/:dppId/elements/*", // ReadElement
  "patch /dpps/:dppId/collections/:collectionId", // UpdateDataElementCollection
  "patch /dpps/:dppId/elements/*", // UpdateElement
];

function facadeRoutes(): Set<string> {
  const routes = new Set<string>();
  for (const route of app.routes) {
    if (route.method === "ALL") continue;
    if (!route.path.startsWith(`${NORM_FACADE_PREFIX}/`)) continue;
    routes.add(`${route.method.toLowerCase()} ${route.path.slice(NORM_FACADE_PREFIX.length)}`);
  }

  return routes;
}

const catalogued = new Set(operations.map((operation) => `${operation.method} ${operation.path}`));

describe("OpenAPI contract", () => {
  describe("the catalogue and the router agree", () => {
    it("documents every registered route", () => {
      const undocumented = [...registeredRoutes()].filter((route) => !catalogued.has(route));

      expect(undocumented).toEqual([]);
    });

    it("registers every documented route", () => {
      const registered = registeredRoutes();
      const missing = [...catalogued].filter((route) => !registered.has(route));

      expect(missing).toEqual([]);
    });

    // A path that only exists unversioned would be a dead end: whoever
    // migrates to `/v1` would silently lose it.
    it("serves every route under /v1 as well", () => {
      const versioned = new Set(
        app.routes
          .filter(
            (route) => route.method !== "ALL" && route.path.startsWith(`${API_VERSION_PREFIX}/`),
          )
          .map(
            (route) =>
              `${route.method.toLowerCase()} ${route.path.slice(API_VERSION_PREFIX.length)}`,
          ),
      );

      const missing = [...catalogued].filter((route) => !versioned.has(route));
      expect(missing).toEqual([]);
    });
  });

  // The facade follows the norm, not our cut - hence a separate comparison
  // against the tables instead of the OpenAPI catalogue.
  describe("the norm facade matches EN 18222 tables 17 and 19", () => {
    it("serves every operation the tables define", () => {
      const registered = facadeRoutes();
      const missing = NORM_OPERATIONS.filter((operation) => !registered.has(operation));

      expect(missing).toEqual([]);
    });

    // Whatever the norm does not name does not belong in the facade: it is the
    // outward-facing contract, not a second entry point into the whole app.
    it("offers nothing the tables do not define", () => {
      const extra = [...facadeRoutes()].filter((operation) => !NORM_OPERATIONS.includes(operation));

      expect(extra).toEqual([]);
    });
  });

  describe("the generated document", () => {
    const document = buildOpenApiDocument() as {
      paths: Record<
        string,
        Record<
          string,
          { parameters?: { in: string; name: string }[]; responses: Record<string, unknown> }
        >
      >;
    };

    it("puts every path under the version prefix", () => {
      for (const path of Object.keys(document.paths)) {
        expect(path.startsWith(`${API_VERSION_PREFIX}/`)).toBe(true);
      }
    });

    it("translates path parameters into OpenAPI form", () => {
      const operation = document.paths[`${API_VERSION_PREFIX}/dpps/{dppId}`]?.get;

      expect(operation).toBeDefined();
      expect(
        operation?.parameters?.some(
          (parameter) => parameter.in === "path" && parameter.name === "dppId",
        ),
      ).toBe(true);
    });

    // The tenant header is not optional: without it the route answers with
    // 400. Whoever doesn't learn that from the document builds the first call
    // wrong.
    it("names the organization header on tenant-scoped operations", () => {
      const operation = document.paths[`${API_VERSION_PREFIX}/dpps`]?.get;

      const header = operation?.parameters?.find((parameter) => parameter.in === "header");
      expect(header?.name).toBe("x-organization-id");
    });

    it("describes the query parameters of the DPP list", () => {
      const names = document.paths[`${API_VERSION_PREFIX}/dpps`]?.get?.parameters
        ?.filter((parameter) => parameter.in === "query")
        .map((parameter) => parameter.name);

      expect(names).toEqual(
        expect.arrayContaining(["limit", "offset", "productId", "search", "status"]),
      );
    });

    it("documents the error envelope wherever an input is validated", () => {
      const operation = document.paths[`${API_VERSION_PREFIX}/dpps`]?.post;

      expect(operation?.responses["422"]).toBeDefined();
      expect(operation?.responses["201"]).toBeDefined();
    });
  });

  describe("the served document", () => {
    it("is reachable anonymously under both prefixes", async () => {
      const unversioned = await anonymous.get<{ openapi: string }>("/openapi.json");
      const versioned = await anonymous.get<{ openapi: string }>(
        `${API_VERSION_PREFIX}/openapi.json`,
      );

      expect(unversioned.status).toBe(200);
      expect(versioned.status).toBe(200);
      expect(versioned.body.openapi).toBe("3.1.0");
    });
  });

  describe("deprecation of the unversioned surface", () => {
    it("marks an unversioned response as deprecated with a sunset date", async () => {
      const response = await anonymous.get("/health");

      expect(response.headers.get("deprecation")).toBe("true");
      // A sunset without a date would be a mood, not a commitment.
      expect(Number.isNaN(Date.parse(response.headers.get("sunset") ?? ""))).toBe(false);
      expect(response.headers.get("link")).toContain('rel="successor-version"');
      expect(response.headers.get("link")).toContain(`${API_VERSION_PREFIX}/health`);
    });

    it("leaves the versioned surface unmarked", async () => {
      const response = await anonymous.get(`${API_VERSION_PREFIX}/health`);

      expect(response.status).toBe(200);
      expect(response.headers.get("deprecation")).toBeNull();
      expect(response.headers.get("sunset")).toBeNull();
    });

    it("answers the same under both prefixes, including the tenant surface", async () => {
      const organization = await createOrganization("openapi");

      const unversioned = await organization.admin.get<{ result: unknown }>("/dpps");
      const versioned = await organization.admin.get<{ result: unknown }>(
        `${API_VERSION_PREFIX}/dpps`,
      );

      expect(unversioned.status).toBe(200);
      expect(versioned.status).toBe(200);
      expect(versioned.body).toEqual(unversioned.body);
    });

    it("keeps the versioned surface behind the same guards", async () => {
      // No cookie, no organization header: `/v1` is a new path, not a new
      // trust relationship.
      const response = await anonymous.get(`${API_VERSION_PREFIX}/dpps`);

      expect(response.status).toBe(401);
    });
  });
});
