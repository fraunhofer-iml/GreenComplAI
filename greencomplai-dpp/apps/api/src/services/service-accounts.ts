import {
  createApiKey,
  createServiceAccount,
  findServiceAccount,
  listApiKeys,
  listServiceAccounts,
  revokeApiKey,
  setServiceAccountStatus,
} from "@dpp/db";
import type { CreateApiKeyInput, CreateServiceAccountInput } from "@dpp/schemas";

import { db } from "../db.js";
import { isUniqueViolation } from "../db-errors.js";
import { generateApiKey } from "./api-keys.js";

type Result<T> =
  { ok: true; value: T } | { code: string; message: string; ok: false; status: 404 | 409 };

const notFound = (code: string, message: string) =>
  ({ code, message, ok: false, status: 404 }) as const;

export async function getServiceAccounts(organizationId: string) {
  return { ok: true, value: await listServiceAccounts(db, organizationId) } as const;
}

export async function registerServiceAccount(
  organizationId: string,
  actorUserId: string,
  input: CreateServiceAccountInput,
): Promise<Result<Awaited<ReturnType<typeof createServiceAccount>>>> {
  try {
    return {
      ok: true,
      value: await createServiceAccount(db, {
        actorUserId,
        name: input.name,
        organizationId,
        role: input.role,
        scopes: input.scopes,
      }),
    };
  } catch (error) {
    // One name per organization - "which account is this" should stay
    // answerable. A duplicate is a conflict on the caller's side, not a
    // server error.
    if (isUniqueViolation(error)) {
      return {
        code: "SERVICE_ACCOUNT_NAME_TAKEN",
        message: `A service account named "${input.name}" already exists in this organization`,
        ok: false,
        status: 409,
      };
    }
    throw error;
  }
}

export async function updateServiceAccount(
  organizationId: string,
  actorUserId: string,
  serviceAccountId: string,
  status: "active" | "disabled",
) {
  const account = await setServiceAccountStatus(db, {
    actorUserId,
    organizationId,
    serviceAccountId,
    status,
  });
  if (!account) return notFound("SERVICE_ACCOUNT_NOT_FOUND", "Service account not found");

  return { ok: true, value: account } as const;
}

export async function getServiceAccountKeys(organizationId: string, serviceAccountId: string) {
  const account = await findServiceAccount(db, organizationId, serviceAccountId);
  if (!account) return notFound("SERVICE_ACCOUNT_NOT_FOUND", "Service account not found");

  return { ok: true, value: await listApiKeys(db, organizationId, serviceAccountId) } as const;
}

// The only place where a key's plaintext exists. It is generated, returned
// once, and stored nowhere - whoever loses it creates a new one and revokes
// the old. That is exactly why an account can have several.
export async function createServiceAccountKey(
  organizationId: string,
  actorUserId: string,
  serviceAccountId: string,
  input: CreateApiKeyInput,
): Promise<Result<{ key: unknown; plaintext: string }>> {
  const account = await findServiceAccount(db, organizationId, serviceAccountId);
  if (!account) return notFound("SERVICE_ACCOUNT_NOT_FOUND", "Service account not found");

  const generated = generateApiKey();
  const key = await createApiKey(db, {
    actorUserId,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    keyPrefix: generated.keyPrefix,
    label: input.label,
    organizationId,
    secretHash: generated.secretHash,
    serviceAccountId,
  });

  return { ok: true, value: { key, plaintext: generated.plaintext } };
}

export async function revokeServiceAccountKey(
  organizationId: string,
  actorUserId: string,
  keyId: string,
) {
  const key = await revokeApiKey(db, { actorUserId, keyId, organizationId });
  // An already-revoked key ends up here too: the query only matches keys
  // that are still valid, so the original revocation timestamp is preserved.
  if (!key) return notFound("API_KEY_NOT_FOUND", "API key not found or already revoked");

  return { ok: true, value: key } as const;
}
