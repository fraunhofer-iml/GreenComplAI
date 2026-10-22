import { Hono } from "hono";

import type { AppBindings } from "../http/context.js";
import { toNormResult } from "../http/norm-result.js";

// The norm facade per EN 18222 section 8 (Table 17 and 19).
//
// It is a **delegation layer**, not a second application: every request is
// rewritten to the internal route and sent through the same app. That way
// authentication, tenant checks, role gates, policies, validation,
// versioning and audit apply unchanged - they cannot be forgotten here
// because they are not implemented here at all.
//
// The design comes from the REST refactor : Table 17's paths
// (`dppsByProductId/{id}`) are RPC dressed as REST. Folding them into the
// internal API would have spoiled its style; ignoring them would have missed
// the norm's contract. Keeping them separate means that if the norm changes
// its design style, only this file changes.
//
// The facade itself does exactly three things:
//   1. Translates paths (Table 17/19 -> internal REST paths),
//   2. Maps errors into the norm's result object (Table 13-16),
//   3. Passes successes through **unchanged** - Table 16 marks every
//      `Success*` code with "has result object: No".

export const NORM_FACADE_PREFIX = "/en18222/v1";

// The internal API answers under a key (`{ dpp: ... }`), the norm expects the
// result bare (Table 17: "result: DPP"). Unwrapping happens here, and only
// here, so the internal shape does not need to change.
type Delegation = {
  path: string;
  unwrap?: string;
};

async function delegate(
  c: { req: { raw: Request } },
  app: Hono<AppBindings>,
  delegation: Delegation,
  init?: { body?: string | null; method?: string },
): Promise<Response> {
  const original = new URL(c.req.raw.url);
  const target = new URL(original.toString());
  target.pathname = delegation.path;

  const request = new Request(target, {
    method: init?.method ?? c.req.raw.method,
    headers: c.req.raw.headers,
    body: init?.body ?? (await bodyOf(c.req.raw)),
  });

  const response = await app.fetch(request);
  return reshape(response, delegation.unwrap);
}

async function bodyOf(request: Request): Promise<string | null> {
  if (request.method === "GET" || request.method === "HEAD") return null;
  return await request.text();
}

// Resolves a productId to the passport the norm means ("latest DPP version").
// Shared by the two Table 17 operations that go through the productId, so the
// same resolution does not appear twice.
async function resolveByProductId(
  app: Hono<AppBindings>,
  request: Request,
  productId: string,
): Promise<{ publicId: string } | { response: Response }> {
  const query = encodeURIComponent(productId);
  const response = await app.fetch(
    new Request(new URL(`/dpps?productId=${query}&limit=1`, request.url), {
      headers: request.headers,
    }),
  );

  if (!response.ok) {
    return {
      response: Response.json(toNormResult(safeParse(await response.text()), response.status), {
        status: response.status,
      }),
    };
  }

  const body = (await response.json()) as { result?: { dpps?: { publicId: string }[] } };
  const first = body.result?.dpps?.[0];
  if (!first) {
    return { response: Response.json(toNormResult(undefined, 404), { status: 404 }) };
  }

  return { publicId: first.publicId };
}

async function reshape(
  response: Response,
  unwrap: string | undefined,
  then?: string,
): Promise<Response> {
  // Redirects (document download) and empty responses pass through unchanged.
  if (response.status === 204 || response.status === 302) return response;

  const text = await response.text();
  const payload = text ? safeParse(text) : undefined;

  if (!response.ok) {
    // The internal response already carries the correlation id where one
    // exists (exceptions); it is passed through, not reinvented.
    return Response.json(toNormResult(payload, response.status), {
      status: response.status,
      headers: normHeaders(response),
    });
  }

  const unwrapped =
    unwrap && payload && typeof payload === "object" && unwrap in payload
      ? (payload as Record<string, unknown>)[unwrap]
      : payload;
  // A second layer of unwrapping for where the norm reaches deeper than our
  // response shape: Table 17 wants the DPP for the date query, not the
  // version envelope around it.
  const value =
    then && unwrapped && typeof unwrapped === "object" && then in unwrapped
      ? (unwrapped as Record<string, unknown>)[then]
      : unwrapped;

  return Response.json(value ?? null, {
    status: response.status,
    headers: normHeaders(response),
  });
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// The deprecation headers of the unversioned surface do not belong here: the
// facade is versioned independently and is not being deprecated.
function normHeaders(response: Response): Headers {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return headers;
}

export function createNormFacade(app: Hono<AppBindings>) {
  return (
    new Hono<AppBindings>()
      // --- Table 17: lifecycle API -----------------------------------------
      .get("/dpps/:dppId", (c) =>
        delegate(c, app, { path: `/dpps/${c.req.param("dppId")}`, unwrap: "dpp" }),
      )
      // `dppsByProductId/{productId}` - a filter carried in the path. Internally
      // this is `GET /dpps?productId=`; the facade takes the first hit because
      // the norm expects exactly one DPP as a result ("latest DPP version").
      .get("/dppsByProductId/:productId", async (c) => {
        const resolved = await resolveByProductId(app, c.req.raw, c.req.param("productId"));
        if ("response" in resolved) return resolved.response;

        return delegate(c, app, { path: `/dpps/${resolved.publicId}`, unwrap: "dpp" });
      })
      // `dppsByProductIdAndDate/{productId}?date=` - a path filter as above,
      // plus the point in time as a query parameter. First the passport via
      // the productId, then its version as of that point in time.
      .get("/dppsByProductIdAndDate/:productId", async (c) => {
        const resolved = await resolveByProductId(app, c.req.raw, c.req.param("productId"));
        if ("response" in resolved) return resolved.response;

        const date = new URL(c.req.raw.url).searchParams.get("date") ?? "";
        const target = `/dpps/${resolved.publicId}/versions-at?date=${encodeURIComponent(date)}`;
        // Per Table 17, the result is the DPP as of this date, not the
        // version envelope around it. The facade unwraps the snapshot.
        const response = await app.fetch(
          new Request(new URL(target, c.req.raw.url), { headers: c.req.raw.headers }),
        );

        return reshape(response, "version", "snapshot");
      })
      .delete("/dpps/:dppId", (c) => delegate(c, app, { path: `/dpps/${c.req.param("dppId")}` }))
      .post("/dppsByProductIds", (c) =>
        delegate(c, app, { path: "/dpps/ids-by-products", unwrap: "result" }),
      )
      .post("/dpps", (c) => delegate(c, app, { path: "/dpps" }))
      .patch("/dpps/:dppId", async (c) => {
        // Table 17 says "partial DPP", the semantics for that are RFC 7396.
        // The internal route expects the patch under `snapshot`; the facade
        // wraps it instead of teaching the internal API a second body shape.
        const patch = await c.req.raw.text();
        return delegate(
          c,
          app,
          { path: `/dpps/${c.req.param("dppId")}`, unwrap: "dpp" },
          { body: JSON.stringify({ snapshot: safeParse(patch) ?? {} }) },
        );
      })

      // --- Table 19: fine-grained lifecycle API ----------------------------
      .get("/dpps/:dppId/collections/:collectionId", (c) =>
        delegate(c, app, {
          path: `/dpps/${c.req.param("dppId")}/collections/${c.req.param("collectionId")}`,
          unwrap: "collection",
        }),
      )
      .patch("/dpps/:dppId/collections/:collectionId", (c) =>
        delegate(c, app, {
          path: `/dpps/${c.req.param("dppId")}/collections/${c.req.param("collectionId")}`,
          unwrap: "collection",
        }),
      )
      .get("/dpps/:dppId/elements/*", (c) =>
        delegate(c, app, {
          path: internalElementPath(c.req.path, c.req.param("dppId")),
          unwrap: "element",
        }),
      )
      .patch("/dpps/:dppId/elements/*", (c) =>
        delegate(c, app, {
          path: internalElementPath(c.req.path, c.req.param("dppId")),
          unwrap: "element",
        }),
      )
  );
}

function internalElementPath(requestPath: string, dppId: string): string {
  const marker = `/dpps/${dppId}/elements/`;
  const index = requestPath.indexOf(marker);
  const rest = index < 0 ? "" : requestPath.slice(index + marker.length);

  return `/dpps/${dppId}/elements/${rest}`;
}
