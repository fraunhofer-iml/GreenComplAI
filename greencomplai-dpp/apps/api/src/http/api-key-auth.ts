import { findApiKeyByPrefix, touchApiKeyUsage } from "@dpp/db";
import type { MiddlewareHandler } from "hono";

import { db } from "../db.js";
import { apiKeyFromHeader, parseApiKey, secretMatches } from "../services/api-keys.js";
import type { AppBindings, ApiScope } from "./context.js";
import { serviceAccountActorId } from "./context.js";
import { jsonError } from "./result.js";

// Authentication via API key - the credential type for ERP, PLM, PIM,
// and MES integrations.
//
// Runs **before** session validation and, on success, sets the same context
// fields a session would set: tenant, role, actor. Everything downstream -
// role gates, policies, reference checks, audit - treats a key-authenticated
// call exactly like any other afterwards. That's the point: there is no
// second authorization path that would need to be secured separately.
//
// An invalid key does **not** cause a rejection, only a call without an
// identity: session validation runs next, and `requireAuth` rejects at the
// end. Otherwise a client that accidentally sends a stale key could no longer
// fall back to working via its session.
//
// Every rejection looks the same. Whether a key is unknown, revoked, expired,
// or its service account is deactivated is not revealed in the response -
// otherwise it would be an oracle for "which prefixes exist".
export const attachApiKeyContext: MiddlewareHandler<AppBindings> = async (c, next) => {
  const presented = apiKeyFromHeader(c.req.header("authorization"));
  if (!presented) {
    await next();
    return;
  }

  const parsed = parseApiKey(presented);
  if (!parsed) {
    await next();
    return;
  }

  const record = await findApiKeyByPrefix(db, parsed.keyPrefix);
  if (!record) {
    await next();
    return;
  }

  // The comparison runs in constant time and **before** the state checks:
  // otherwise the response time would reveal whether a key exists for a given
  // prefix at all.
  const matches = secretMatches(parsed.secret, record.secretHash);
  const usable =
    matches &&
    !record.revokedAt &&
    record.serviceAccountStatus === "active" &&
    (!record.expiresAt || record.expiresAt > new Date());

  if (!usable) {
    await next();
    return;
  }

  c.set("apiKey", {
    scopes: (record.scopes as ApiScope[]) ?? [],
    serviceAccountId: record.serviceAccountId,
  });
  c.set("organizationId", record.organizationId);
  c.set("role", record.role);
  c.set("userId", serviceAccountActorId(record.serviceAccountId));

  // No `await`: "last used" is operational bookkeeping, not part of the
  // request. Waiting for it would slow down every integration call with a
  // write, and a failure here must not fail the call either.
  void touchApiKeyUsage(db, record.keyId, new Date()).catch(() => undefined);

  await next();
};

// Session-only endpoints a key must not reach: managing credentials
// themselves. A key that can issue new keys is no longer a bounded
// permission - it's one that extends itself.
export const denyApiKey: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (c.get("apiKey")) {
    return jsonError(c, "This endpoint requires a signed-in user, not an API key", {
      code: "SESSION_REQUIRED",
      status: 403,
    });
  }

  await next();
};
