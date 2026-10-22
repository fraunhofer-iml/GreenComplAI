import {
  connectorConnectionResponseSchema,
  connectorDictionaryResponseSchema,
  connectorInstallationResponseSchema,
  connectorMappingProfileResponseSchema,
  connectorPreviewResponseSchema,
  connectorRemovalResponseSchema,
  connectorsResponseSchema,
  connectorStatusSchema,
  createConnectorDictionarySchema,
  importedProductResponseSchema,
  importExternalProductSchema,
  installConnectorSchema,
  saveConnectorMappingSchema,
} from "@dpp/schemas";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

import { denyApiKey } from "../http/api-key-auth.js";
import type { AppBindings } from "../http/context.js";
import {
  getActorUserId,
  getOrganizationRole,
  requireRole,
  requireTwoFactor,
} from "../http/context.js";
import { getOrganizationOrError } from "../http/organization.js";
import { jsonResponse } from "../http/response.js";
import { jsonError } from "../http/result.js";
import {
  createDictionaryFromDraft,
  getConnectorCatalog,
  getMappingProfile,
  importExternalProduct,
  installConnector,
  previewExternalProduct,
  saveMappingProfile,
  setConnectorStatus,
  testConnector,
  uninstallConnector,
} from "../services/connectors.js";

// Connectors to external systems (ERP, PLM, PIM, MES) - split in two and
// deliberately guarded to different degrees.
//
// **Managing** (install, configure, remove) is admin-only and requires a
// session. The reason is the same as for technical credentials: this is where
// credentials to a foreign system get stored. A key allowed to do this would
// no longer be a limited permission - it would be a way to gain access to the
// ERP through the platform.
//
// **Using** (looking up, importing) is everyday catalog work and open to
// editors. A key may do this too: this is exactly the case service accounts
// exist for - a nightly job pulling new articles from the ERP.
export const connectorRoutes = new Hono<AppBindings>()
  .use("/connectors", denyApiKey, requireTwoFactor)
  .use("/connectors/:connectorKey", denyApiKey, requireTwoFactor)
  .use("/connectors/:connectorKey/status", denyApiKey, requireTwoFactor)
  .use("/connectors/:connectorKey/test", denyApiKey, requireTwoFactor)
  .get("/connectors", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return jsonResponse(c, connectorsResponseSchema, await getConnectorCatalog(organizationId), {
      context: "GET /connectors",
      key: "connectors",
    });
  })
  // PUT, not POST: sending the same key twice leads to the same state, and the
  // key is chosen by the caller (it lives in the manifest), not the server.
  .put("/connectors/:connectorKey", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = installConnectorSchema.safeParse(
      (await c.req.json().catch(() => undefined)) ?? {},
    );
    if (!parsed.success) {
      return jsonError(c, "Invalid connector configuration", {
        code: "VALIDATION_FAILED",
        status: 422,
      });
    }

    return respond(
      c,
      connectorInstallationResponseSchema,
      await installConnector(
        organizationId,
        getActorUserId(c),
        c.req.param("connectorKey"),
        parsed.data.values,
      ),
      "PUT /connectors/:connectorKey",
      "connector",
    );
  })
  .put("/connectors/:connectorKey/status", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = connectorStatusSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) {
      return jsonError(c, "Invalid connector status", { code: "VALIDATION_FAILED", status: 422 });
    }

    return respond(
      c,
      connectorInstallationResponseSchema,
      await setConnectorStatus(
        organizationId,
        getActorUserId(c),
        c.req.param("connectorKey"),
        parsed.data.status,
      ),
      "PUT /connectors/:connectorKey/status",
      "connector",
    );
  })
  .delete("/connectors/:connectorKey", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    // Responds with a body instead of 204: the other delete routes of this API
    // do the same, so a client that has to special-case an empty body for one
    // of them trips over exactly one convention.
    return respond(
      c,
      connectorRemovalResponseSchema,
      await uninstallConnector(organizationId, getActorUserId(c), c.req.param("connectorKey")),
      "DELETE /connectors/:connectorKey",
      "connector",
    );
  })
  // A cheap read call against the external system so "are the credentials
  // correct" is answered before anyone needs them in day-to-day use.
  .post("/connectors/:connectorKey/test", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      connectorConnectionResponseSchema,
      await testConnector(organizationId, c.req.param("connectorKey")),
      "POST /connectors/:connectorKey/test",
      "connection",
    );
  })
  // Lookup is read-only and writes nothing - hence GET with the id in the
  // path. The response carries both: the values from the external system
  // **and** what would happen to each field. Seeing only the values leaves
  // nothing to decide; seeing only the targets does not either.
  .get(
    "/connectors/:connectorKey/products/:externalId",
    requireRole("admin", "editor"),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const outcome = await previewExternalProduct(
        organizationId,
        c.req.param("connectorKey"),
        c.req.param("externalId"),
      );
      if (!outcome.ok) {
        return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
      }

      // No envelope key: the response **is** `{ product, mapping }` - wrapping
      // it again would mean `{ preview: { product, mapping } }`.
      return jsonResponse(c, connectorPreviewResponseSchema, outcome.value, {
        context: "GET /connectors/:connectorKey/products/:externalId",
      });
    },
  )
  // The stored mapping of a record type, without having to look up a record
  // for it - for maintaining a profile outside of an import.
  .get("/connectors/:connectorKey/mappings", requireRole("admin", "editor"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      connectorMappingProfileResponseSchema,
      await getMappingProfile(
        organizationId,
        c.req.param("connectorKey"),
        c.req.query("sourceType") ?? "",
      ),
      "GET /connectors/:connectorKey/mappings",
      "mapping",
    );
  })
  .put("/connectors/:connectorKey/mappings", requireRole("admin", "editor"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = saveConnectorMappingSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) {
      return jsonError(c, "Invalid field mapping", { code: "VALIDATION_FAILED", status: 422 });
    }

    return respond(
      c,
      connectorMappingProfileResponseSchema,
      await saveMappingProfile(
        organizationId,
        getActorUserId(c),
        c.req.param("connectorKey"),
        parsed.data.sourceType,
        parsed.data.fields,
      ),
      "PUT /connectors/:connectorKey/mappings",
      "mapping",
    );
  })
  // Creating the dictionary a record kind's fields were drafted into.
  //
  // Same permission as the import, and for the same reason: this is catalogue
  // work, not administration. It is also the same permission the catalogue's
  // own dictionary routes carry - a route that let an editor build a
  // vocabulary here but not there would be a hole, not a convenience.
  //
  // A separate call from the import on purpose. The dictionary is the
  // precondition for a mapping, and the mapping is what the import needs -
  // folding all three into one request would mean a failed passport takes the
  // vocabulary down with it.
  .post("/connectors/:connectorKey/dictionary", requireRole("admin", "editor"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = createConnectorDictionarySchema.safeParse(
      await c.req.json().catch(() => undefined),
    );
    if (!parsed.success) {
      return jsonError(c, "Invalid dictionary draft", { code: "VALIDATION_FAILED", status: 422 });
    }

    return respond(
      c,
      connectorDictionaryResponseSchema,
      await createDictionaryFromDraft(organizationId, c.req.param("connectorKey"), parsed.data),
      "POST /connectors/:connectorKey/dictionary",
      "dictionary",
      201,
    );
  })
  .post("/connectors/:connectorKey/import", requireRole("admin", "editor"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = importExternalProductSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) {
      return jsonError(c, "Invalid import request", { code: "VALIDATION_FAILED", status: 422 });
    }

    const outcome = await importExternalProduct(
      organizationId,
      getActorUserId(c),
      c.req.param("connectorKey"),
      parsed.data.externalId,
      // The role travels along: when a passport is created, `createDppSnapshot`
      // checks it against the data elements' policies - the same path as manual
      // creation, no side entrance.
      getOrganizationRole(c),
      {
        dpp: parsed.data.dpp,
        fields: parsed.data.fields,
        saveMapping: parsed.data.saveMapping,
      },
    );
    if (!outcome.ok) {
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }

    return jsonResponse(c, importedProductResponseSchema, outcome.value, {
      context: "POST /connectors/:connectorKey/import",
      key: "product",
      status: outcome.value.created ? 201 : 200,
    });
  });

function respond<T>(
  c: Context<AppBindings>,
  schema: ZodType<T>,
  outcome:
    | { ok: true; value: unknown }
    | { code: string; message: string; ok: false; status: ContentfulStatusCode },
  context: string,
  key: string,
  successStatus: ContentfulStatusCode = 200,
) {
  if (!outcome.ok) {
    return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
  }

  return jsonResponse(c, schema, outcome.value, { context, key, status: successStatus });
}
