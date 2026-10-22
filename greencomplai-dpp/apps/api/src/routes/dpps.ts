import type { DppStatus } from "@dpp/domain";
import {
  createDppRelationshipSchema,
  createDppResponseSchema,
  createDppSchema,
  dataElementCollectionResponseSchema,
  dataElementResponseSchema,
  deletedDppResponseSchema,
  dppAuditResponseSchema,
  dppExportQuerySchema,
  dppExportResponseSchema,
  dppImportReportSchema,
  dppImportSchema,
  dppIdsByProductsResponseSchema,
  dppListQuerySchema,
  dppListResponseSchema,
  dppRelationshipResponseSchema,
  dppRelationshipsResponseSchema,
  dppsByProductIdsSchema,
  dppSnapshotSchema,
  dppTimelineResponseSchema,
  dictionaryUpgradeResponseSchema,
  dppValidationReportResponseSchema,
  dppVersionAtDateQuerySchema,
  dppVersionAtDateResponseSchema,
  dppVersionDetailResponseSchema,
  dppVersionsResponseSchema,
  dppViewResponseSchema,
  patchDppSchema,
  setDppStatusSchema,
  sustainabilityQuerySchema,
  sustainabilityReportResponseSchema,
} from "@dpp/schemas";
import { zValidator } from "../http/validator.js";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

import type { AppBindings } from "../http/context.js";
import { getActorUserId, getOrganizationRole, requireRole } from "../http/context.js";
import { getOrganizationOrError } from "../http/organization.js";
import { jsonResponse } from "../http/response.js";
import { fieldResult, jsonError } from "../http/result.js";
import { importDpps } from "../services/dpp-import.js";
import { buildSustainabilityReport } from "../services/sustainability.js";
import {
  createDppRevision,
  createDppSnapshot,
  createRelationshipForDpp,
  deleteDpp,
  deleteRelationshipForDpp,
  exportDpps,
  getDppAudit,
  getDppCollection,
  getDppElement,
  getDppIdsByProductIds,
  getDppRelationships,
  getDppList,
  getDppSnapshot,
  getDppTimeline,
  getDictionaryUpgrade,
  getDppValidation,
  getDppVersionAtDate,
  getDppVersionDetail,
  getDppVersions,
  getDppView,
  patchDppCollection,
  patchDppElement,
  patchDppSnapshot,
  restoreDppVersion,
  transitionDppStatus,
  type ServiceResult,
} from "../services/dpps.js";

export const dppRoutes = new Hono<AppBindings>()
  .get("/dpps", zValidator("query", dppListQuerySchema), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    // Repeatable filter: ?productId=a&productId=b. Replaced the separate
    // by-product and ids-by-products GET routes, which were filters wearing a
    // path.
    const { limit, offset, productId, search, status } = c.req.valid("query");

    return respond(
      c,
      dppListResponseSchema,
      await getDppList(organizationId, {
        limit,
        offset,
        productIds: productId?.length ? productId : undefined,
        search,
        status,
      }),
      "GET /dpps",
      "result",
    );
  })
  // Bulk creation (/). Row-by-row report instead of all-or-nothing: an
  // import of 500 passports that fails entirely because of row 297 is
  // worthless to the caller.
  .post(
    "/dpps/import",
    requireRole("admin", "editor"),
    zValidator("json", dppImportSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const report = await importDpps(
        organizationId,
        getActorUserId(c),
        c.req.valid("json"),
        getOrganizationRole(c),
      );

      // 200, not 207: the import as a whole succeeded, its report says what
      // became of each row. A multi-status response would be a second error
      // shape next to the result envelope - the caller would have to read
      // both to learn the same thing.
      return jsonResponse(c, dppImportReportSchema, report, {
        context: "POST /dpps/import",
        key: "report",
      });
    },
  )
  // ESRS reporting feed: input figures from the published passports, with
  // evidence down to the individual passport. Explicitly **not**
  // report-ready metrics - that limitation is carried as `scopeNote` on the
  // result.
  .get("/sustainability/metrics", zValidator("query", sustainabilityQuerySchema), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const report = await buildSustainabilityReport(
      organizationId,
      new Date(c.req.valid("query").asOf),
      getOrganizationRole(c),
    );

    return jsonResponse(c, sustainabilityReportResponseSchema, report, {
      context: "GET /sustainability/metrics",
      key: "report",
    });
  })
  .get("/dpps/export", zValidator("query", dppExportQuerySchema), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const { limit, offset, status } = c.req.valid("query");
    return respond(
      c,
      dppExportResponseSchema,
      await exportDpps(organizationId, { limit, offset, status }, getOrganizationRole(c)),
      "GET /dpps/export",
      "export",
    );
  })
  .get("/dpps/:dppId/view", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppViewResponseSchema,
      await getDppView(
        organizationId,
        c.req.param("dppId"),
        getOrganizationRole(c),
        getActorUserId(c),
      ),
      "GET /dpps/:dppId/view",
      "view",
    );
  })
  // DIN EN 18222 Table 17 `dppsByProductIds`: normative contract — the set of
  // product IDs is sent in the request body.
  .post("/dpps/ids-by-products", zValidator("json", dppsByProductIdsSchema), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const body = c.req.valid("json");
    return respond(
      c,
      dppIdsByProductsResponseSchema,
      await getDppIdsByProductIds(organizationId, body.productIds, {
        limit: body.limit ?? 50,
        cursor: body.cursor,
      }),
      "POST /dpps/ids-by-products",
      "result",
    );
  })
  .get("/dpps/:dppId", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppSnapshotSchema,
      await getDppSnapshot(
        organizationId,
        c.req.param("dppId"),
        getOrganizationRole(c),
        getActorUserId(c),
      ),
      "GET /dpps/:dppId",
      "dpp",
    );
  })
  .post("/dpps", requireRole("admin", "editor"), zValidator("json", createDppSchema), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const outcome = await createDppSnapshot(
      organizationId,
      getActorUserId(c),
      c.req.valid("json"),
      getOrganizationRole(c),
    );
    if (!outcome.ok) {
      if (outcome.issues?.length) {
        return c.json(fieldResult(outcome.issues, { code: outcome.code }), outcome.status);
      }
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }

    // { dpp, publicId } un-keyed — the service already returns the response shape.
    return jsonResponse(c, createDppResponseSchema, outcome.value, {
      context: "POST /dpps",
      status: 201,
    });
  })
  .patch(
    "/dpps/:dppId",
    requireRole("admin", "editor"),
    zValidator("json", patchDppSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      return respond(
        c,
        dppSnapshotSchema,
        await patchDppSnapshot(
          organizationId,
          getActorUserId(c),
          c.req.param("dppId"),
          c.req.valid("json"),
          getOrganizationRole(c),
        ),
        "PATCH /dpps/:dppId",
        "dpp",
      );
    },
  )
  // Fine-grained element API (EN 18222 Table 19). The element path can
  // contain a slash (`collection/element`), hence a wildcard segment - a
  // `:elementPath` param would cut off at the separator.
  .get("/dpps/:dppId/collections/:collectionId", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dataElementCollectionResponseSchema,
      await getDppCollection(
        organizationId,
        c.req.param("dppId"),
        c.req.param("collectionId"),
        getOrganizationRole(c),
        getActorUserId(c),
      ),
      "GET /dpps/:dppId/collections/:collectionId",
      "collection",
    );
  })
  .patch("/dpps/:dppId/collections/:collectionId", requireRole("admin", "editor"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dataElementCollectionResponseSchema,
      await patchDppCollection(
        organizationId,
        getActorUserId(c),
        c.req.param("dppId"),
        c.req.param("collectionId"),
        await readJsonBody(c),
        getOrganizationRole(c),
      ),
      "PATCH /dpps/:dppId/collections/:collectionId",
      "collection",
    );
  })
  .get("/dpps/:dppId/elements/*", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dataElementResponseSchema,
      await getDppElement(
        organizationId,
        c.req.param("dppId"),
        elementPathFrom(c.req.path, c.req.param("dppId")),
        getOrganizationRole(c),
        getActorUserId(c),
      ),
      "GET /dpps/:dppId/elements/*",
      "element",
    );
  })
  .patch("/dpps/:dppId/elements/*", requireRole("admin", "editor"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dataElementResponseSchema,
      await patchDppElement(
        organizationId,
        getActorUserId(c),
        c.req.param("dppId"),
        elementPathFrom(c.req.path, c.req.param("dppId")),
        await readJsonBody(c),
        getOrganizationRole(c),
      ),
      "PATCH /dpps/:dppId/elements/*",
      "element",
    );
  })
  // EN 18222 Table 17 `ReadDPPVersionByProductIdAndDate` - modeled internally
  // as a sub-resource of versions, because that is exactly what is asked
  // for: a version selected by a point in time instead of by a number.
  .get("/dpps/:dppId/versions-at", zValidator("query", dppVersionAtDateQuerySchema), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppVersionAtDateResponseSchema,
      await getDppVersionAtDate(
        organizationId,
        c.req.param("dppId"),
        new Date(c.req.valid("query").date),
        getOrganizationRole(c),
        getActorUserId(c),
      ),
      "GET /dpps/:dppId/versions-at",
      "version",
    );
  })
  // EN 18222 Table 17 `DeleteDPPById`. Only a draft that was never published
  // is deleted; everything else belongs archived (see `deleteDraftDppRecord`).
  .delete("/dpps/:dppId", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      deletedDppResponseSchema,
      await deleteDpp(organizationId, getActorUserId(c), c.req.param("dppId")),
      "DELETE /dpps/:dppId",
      "result",
    );
  })
  .get("/dpps/:dppId/versions", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppVersionsResponseSchema,
      await getDppVersions(organizationId, c.req.param("dppId")),
      "GET /dpps/:dppId/versions",
      "versions",
    );
  })
  .get("/dpps/:dppId/versions/:versionNumber", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const versionNumber = Number.parseInt(c.req.param("versionNumber"), 10);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      return jsonError(c, "Invalid version number", { code: "INVALID_VERSION", status: 400 });
    }

    return respond(
      c,
      dppVersionDetailResponseSchema,
      await getDppVersionDetail(
        organizationId,
        c.req.param("dppId"),
        versionNumber,
        getOrganizationRole(c),
      ),
      "GET /dpps/:dppId/versions/:versionNumber",
      "version",
    );
  })
  .post(
    "/dpps/:dppId/versions/:versionNumber/restore",
    requireRole("admin", "editor"),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const versionNumber = Number.parseInt(c.req.param("versionNumber"), 10);
      if (!Number.isInteger(versionNumber) || versionNumber < 1) {
        return jsonError(c, "Invalid version number", { code: "INVALID_VERSION", status: 400 });
      }

      return respond(
        c,
        dppSnapshotSchema,
        await restoreDppVersion(
          organizationId,
          getActorUserId(c),
          c.req.param("dppId"),
          versionNumber,
          getOrganizationRole(c),
        ),
        "POST /dpps/:dppId/versions/:versionNumber/restore",
        "dpp",
      );
    },
  )
  .get("/dpps/:dppId/audit-events", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppAuditResponseSchema,
      await getDppAudit(organizationId, c.req.param("dppId")),
      "GET /dpps/:dppId/audit-events",
      "audit",
    );
  })
  .get("/dpps/:dppId/timeline", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppTimelineResponseSchema,
      await getDppTimeline(organizationId, c.req.param("dppId"), getOrganizationRole(c)),
      "GET /dpps/:dppId/timeline",
      "entries",
    );
  })
  // The price of the immutable binding : when a new dictionary version
  // appears, the passport stays on its own. This preview reports what
  // versions exist and what an upgrade would do. It is written through the
  // ordinary PATCH on `dppSchemaVersion` - a dedicated write path would be a
  // second place where permission checks could be forgotten.
  .get("/dpps/:dppId/dictionary-upgrade", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dictionaryUpgradeResponseSchema,
      await getDictionaryUpgrade(organizationId, c.req.param("dppId")),
      "GET /dpps/:dppId/dictionary-upgrade",
      "upgrade",
    );
  })
  .get("/dpps/:dppId/validation", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppValidationReportResponseSchema,
      await getDppValidation(organizationId, c.req.param("dppId")),
      "GET /dpps/:dppId/validation",
      "report",
    );
  })
  .get("/dpps/:dppId/relationships", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      dppRelationshipsResponseSchema,
      await getDppRelationships(organizationId, c.req.param("dppId")),
      "GET /dpps/:dppId/relationships",
      "relationships",
    );
  })
  .post(
    "/dpps/:dppId/relationships",
    requireRole("admin", "editor"),
    zValidator("json", createDppRelationshipSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      return respond(
        c,
        dppRelationshipResponseSchema,
        await createRelationshipForDpp(
          organizationId,
          getActorUserId(c),
          c.req.param("dppId"),
          c.req.valid("json"),
        ),
        "POST /dpps/:dppId/relationships",
        "relationship",
        201,
      );
    },
  )
  .delete(
    "/dpps/:dppId/relationships/:relationshipId",
    requireRole("admin", "editor"),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      return respond(
        c,
        dppRelationshipResponseSchema,
        await deleteRelationshipForDpp(
          organizationId,
          getActorUserId(c),
          c.req.param("dppId"),
          c.req.param("relationshipId"),
        ),
        "DELETE /dpps/:dppId/relationships/:relationshipId",
        "relationship",
      );
    },
  )
  // Opening a revision creates one, so it posts to the collection rather than to
  // a verb.
  .post("/dpps/:dppId/revisions", requireRole("admin", "editor"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;
    return respond(
      c,
      dppSnapshotSchema,
      await createDppRevision(organizationId, getActorUserId(c), c.req.param("dppId")),
      "POST /dpps/:dppId/revisions",
      "dpp",
      201,
    );
  })
  // One status resource instead of four verbs (submit-review / return-to-draft /
  // publish / archive). Which transitions are legal is decided by the domain.
  .put(
    "/dpps/:dppId/status",
    requireRole("admin", "editor"),
    zValidator("json", setDppStatusSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const { status, comment } = c.req.valid("json");

      // The role gate cannot live in middleware any more: it depends on the
      // target. Publishing and archiving stay admin-only, which is what keeps
      // the four-eyes rule intact — an editor submits, an admin releases.
      if (ADMIN_ONLY_STATUSES.has(status) && getOrganizationRole(c) !== "admin") {
        return jsonError(c, `Only an administrator may set the status to ${status}`, {
          code: "FORBIDDEN",
          status: 403,
        });
      }

      return respond(
        c,
        dppSnapshotSchema,
        await transitionDppStatus(
          organizationId,
          getActorUserId(c),
          c.req.param("dppId"),
          status,
          comment,
        ),
        "PUT /dpps/:dppId/status",
        "dpp",
      );
    },
  );

const ADMIN_ONLY_STATUSES = new Set<DppStatus>(["published", "archived"]);

// Everything after `/elements/` is the path - including the slashes in it.
// Hono's wildcard does not deliver it as a named parameter, so it is cut out
// of the path instead. The prefix is passed in rather than guessed, so the
// versioned surface (`/v1/...`) can use the same function.
function elementPathFrom(requestPath: string, dppId: string): string {
  const marker = `/dpps/${dppId}/elements/`;
  const index = requestPath.indexOf(marker);
  if (index < 0) return "";

  return decodeURIComponent(requestPath.slice(index + marker.length));
}

// A merge-patch body is not validated against a schema: per RFC 7396 every
// JSON value is valid, `null` included (it deletes). An unreadable body is
// still a 400, not a silent no-op patch.
async function readJsonBody(c: Context<AppBindings>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

// Sends a service outcome through its response schema. The schema is the
// outbound boundary: it decides what a DPP, version, or relationship looks
// like on the wire, rather than the repository's column list deciding it by
// accident.
function respond<T>(
  c: Context<AppBindings>,
  schema: ZodType<T>,
  result: ServiceResult<unknown>,
  context: string,
  key: string,
  successStatus: ContentfulStatusCode = 200,
) {
  if (!result.ok) {
    // A rejection touching several fields is delivered as several messages
    // too - otherwise the caller would have to split the combined message
    // back apart to map it onto the inputs.
    if (result.issues?.length) {
      return c.json(fieldResult(result.issues, { code: result.code }), result.status);
    }
    return jsonError(c, result.message, { code: result.code, status: result.status });
  }

  return jsonResponse(c, schema, result.value, { context, key, status: successStatus });
}
