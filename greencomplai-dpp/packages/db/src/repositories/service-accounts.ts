import { and, asc, eq, isNull } from "drizzle-orm";

import type { Database } from "../index.js";
import { apiKeys, auditEvents, serviceAccounts } from "../schema.js";

type OrganizationRole = "admin" | "editor" | "viewer" | "authority";
type ApiScope = "read" | "write";

// What a service account exposes externally. No `secretHash`, anywhere - it
// has no business on any response, and a field that doesn't exist can't
// accidentally tag along.
const serviceAccountColumns = {
  createdAt: serviceAccounts.createdAt,
  id: serviceAccounts.id,
  name: serviceAccounts.name,
  role: serviceAccounts.role,
  scopes: serviceAccounts.scopes,
  status: serviceAccounts.status,
  updatedAt: serviceAccounts.updatedAt,
};

const apiKeyColumns = {
  createdAt: apiKeys.createdAt,
  expiresAt: apiKeys.expiresAt,
  id: apiKeys.id,
  // The public part - identifies the key in listings without making it usable.
  keyPrefix: apiKeys.keyPrefix,
  label: apiKeys.label,
  lastUsedAt: apiKeys.lastUsedAt,
  revokedAt: apiKeys.revokedAt,
  serviceAccountId: apiKeys.serviceAccountId,
};

export async function listServiceAccounts(db: Database, organizationId: string) {
  return db
    .select(serviceAccountColumns)
    .from(serviceAccounts)
    .where(eq(serviceAccounts.organizationId, organizationId))
    .orderBy(asc(serviceAccounts.name));
}

export async function findServiceAccount(
  db: Database,
  organizationId: string,
  serviceAccountId: string,
) {
  const [account] = await db
    .select(serviceAccountColumns)
    .from(serviceAccounts)
    .where(
      and(
        eq(serviceAccounts.organizationId, organizationId),
        eq(serviceAccounts.id, serviceAccountId),
      ),
    )
    .limit(1);

  return account;
}

export async function createServiceAccount(
  db: Database,
  input: {
    actorUserId: string;
    name: string;
    organizationId: string;
    role: OrganizationRole;
    scopes: ApiScope[];
  },
) {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .insert(serviceAccounts)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        role: input.role,
        scopes: input.scopes,
        createdBy: input.actorUserId,
      })
      .returning(serviceAccountColumns);
    if (!account) throw new Error("Failed to create service account");

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "service_account.created",
      objectType: "service_account",
      objectId: account.id,
      changedProperties: ["name", "role", "scopes"],
    });

    return account;
  });
}

export async function setServiceAccountStatus(
  db: Database,
  input: {
    actorUserId: string;
    organizationId: string;
    serviceAccountId: string;
    status: "active" | "disabled";
  },
) {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .update(serviceAccounts)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(serviceAccounts.organizationId, input.organizationId),
          eq(serviceAccounts.id, input.serviceAccountId),
        ),
      )
      .returning(serviceAccountColumns);
    if (!account) return undefined;

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "service_account.updated",
      objectType: "service_account",
      objectId: account.id,
      changedProperties: ["status"],
    });

    return account;
  });
}

export async function listApiKeys(db: Database, organizationId: string, serviceAccountId: string) {
  return db
    .select(apiKeyColumns)
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.organizationId, organizationId),
        eq(apiKeys.serviceAccountId, serviceAccountId),
      ),
    )
    .orderBy(asc(apiKeys.createdAt));
}

export async function createApiKey(
  db: Database,
  input: {
    actorUserId: string;
    expiresAt?: Date | undefined;
    keyPrefix: string;
    label?: string | undefined;
    organizationId: string;
    secretHash: string;
    serviceAccountId: string;
  },
) {
  return db.transaction(async (tx) => {
    const [key] = await tx
      .insert(apiKeys)
      .values({
        serviceAccountId: input.serviceAccountId,
        organizationId: input.organizationId,
        keyPrefix: input.keyPrefix,
        secretHash: input.secretHash,
        label: input.label,
        expiresAt: input.expiresAt,
        createdBy: input.actorUserId,
      })
      .returning(apiKeyColumns);
    if (!key) throw new Error("Failed to create API key");

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "api_key.created",
      objectType: "api_key",
      objectId: key.id,
      changedProperties: ["keyPrefix"],
    });

    return key;
  });
}

// Revoke rather than delete: that a key was once valid and when it was
// withdrawn is the answer to "who had access when" - and that answer
// disappears along with the row.
export async function revokeApiKey(
  db: Database,
  input: {
    actorUserId: string;
    keyId: string;
    organizationId: string;
  },
) {
  return db.transaction(async (tx) => {
    const [key] = await tx
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiKeys.organizationId, input.organizationId),
          eq(apiKeys.id, input.keyId),
          // A second revocation must not overwrite the first timestamp -
          // otherwise it would keep moving forward on every call.
          isNull(apiKeys.revokedAt),
        ),
      )
      .returning(apiKeyColumns);
    if (!key) return undefined;

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "api_key.revoked",
      objectType: "api_key",
      objectId: key.id,
      changedProperties: ["revokedAt"],
    });

    return key;
  });
}

// The lookup path for every keyed call. Deliberately one query with a join:
// account and key are needed together, and two queries per request would sit
// on the hottest path of the integration API.
export async function findApiKeyByPrefix(db: Database, keyPrefix: string) {
  const [row] = await db
    .select({
      expiresAt: apiKeys.expiresAt,
      keyId: apiKeys.id,
      organizationId: apiKeys.organizationId,
      revokedAt: apiKeys.revokedAt,
      secretHash: apiKeys.secretHash,
      serviceAccountId: serviceAccounts.id,
      serviceAccountName: serviceAccounts.name,
      serviceAccountStatus: serviceAccounts.status,
      role: serviceAccounts.role,
      scopes: serviceAccounts.scopes,
    })
    .from(apiKeys)
    .innerJoin(serviceAccounts, eq(serviceAccounts.id, apiKeys.serviceAccountId))
    .where(eq(apiKeys.keyPrefix, keyPrefix))
    .limit(1);

  return row;
}

// "Is this key still in use" is the question this answers - hence just the
// day. A second-precision timestamp would be a movement profile of the
// external system, and it would be written on every single call.
export async function touchApiKeyUsage(db: Database, keyId: string, now: Date) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  await db
    .update(apiKeys)
    .set({ lastUsedAt: today })
    .where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)));
}
