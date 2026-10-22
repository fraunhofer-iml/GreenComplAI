import {
  apiKeyResponseSchema,
  apiKeysResponseSchema,
  createApiKeySchema,
  createdApiKeyResponseSchema,
  createServiceAccountSchema,
  patchServiceAccountSchema,
  serviceAccountResponseSchema,
  serviceAccountsResponseSchema,
} from "@dpp/schemas";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

import { denyApiKey } from "../http/api-key-auth.js";
import type { AppBindings } from "../http/context.js";
import { getActorUserId, requireRole, requireTwoFactor } from "../http/context.js";
import { getOrganizationOrError } from "../http/organization.js";
import { jsonResponse } from "../http/response.js";
import { jsonError } from "../http/result.js";
import {
  createServiceAccountKey,
  registerServiceAccount,
  getServiceAccountKeys,
  getServiceAccounts,
  revokeServiceAccountKey,
  updateServiceAccount,
} from "../services/service-accounts.js";

// Management of service account credentials .
//
// Admin-only and **session-only**: a key that can issue new keys or elevate
// its own account is no longer a bounded permission. `denyApiKey` enforces
// that rule, it isn't just an extra precaution.
export const serviceAccountRoutes = new Hono<AppBindings>()
  .use("/service-accounts", denyApiKey, requireTwoFactor)
  .use("/service-accounts/*", denyApiKey, requireTwoFactor)
  .get("/service-accounts", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      serviceAccountsResponseSchema,
      await getServiceAccounts(organizationId),
      "GET /service-accounts",
      "serviceAccounts",
    );
  })
  .post("/service-accounts", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = createServiceAccountSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) {
      return jsonError(c, "Invalid service account", { code: "VALIDATION_FAILED", status: 422 });
    }

    return respond(
      c,
      serviceAccountResponseSchema,
      await registerServiceAccount(organizationId, getActorUserId(c), parsed.data),
      "POST /service-accounts",
      "serviceAccount",
      201,
    );
  })
  .patch("/service-accounts/:serviceAccountId", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = patchServiceAccountSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) {
      return jsonError(c, "Invalid service account patch", {
        code: "VALIDATION_FAILED",
        status: 422,
      });
    }

    return respond(
      c,
      serviceAccountResponseSchema,
      await updateServiceAccount(
        organizationId,
        getActorUserId(c),
        c.req.param("serviceAccountId"),
        parsed.data.status,
      ),
      "PATCH /service-accounts/:serviceAccountId",
      "serviceAccount",
    );
  })
  .get("/service-accounts/:serviceAccountId/keys", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      apiKeysResponseSchema,
      await getServiceAccountKeys(organizationId, c.req.param("serviceAccountId")),
      "GET /service-accounts/:serviceAccountId/keys",
      "keys",
    );
  })
  // Multiple keys per account are the path to rotation without downtime:
  // create a new one, roll it out, revoke the old one.
  .post("/service-accounts/:serviceAccountId/keys", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const parsed = createApiKeySchema.safeParse((await c.req.json().catch(() => undefined)) ?? {});
    if (!parsed.success) {
      return jsonError(c, "Invalid API key request", { code: "VALIDATION_FAILED", status: 422 });
    }

    const outcome = await createServiceAccountKey(
      organizationId,
      getActorUserId(c),
      c.req.param("serviceAccountId"),
      parsed.data,
    );
    if (!outcome.ok) {
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }

    // No wrapping key: the response is already `{ key, plaintext }` -
    // wrapping it again would produce `{ key: { key, plaintext } }`.
    return jsonResponse(c, createdApiKeyResponseSchema, outcome.value, {
      context: "POST /service-accounts/:serviceAccountId/keys",
      status: 201,
    });
  })
  .delete("/service-accounts/:serviceAccountId/keys/:keyId", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return respond(
      c,
      apiKeyResponseSchema,
      await revokeServiceAccountKey(organizationId, getActorUserId(c), c.req.param("keyId")),
      "DELETE /service-accounts/:serviceAccountId/keys/:keyId",
      "key",
    );
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
