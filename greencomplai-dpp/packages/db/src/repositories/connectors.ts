import { and, asc, eq, sql } from "drizzle-orm";

import type { Database } from "../index.js";
import { auditEvents, connectorFieldMappings, organizationConnectors } from "../schema.js";

// What an installation shows to the outside. No `credentials` - that column
// has no business in any response, and a field that is never selected cannot
// accidentally tag along.
//
// `hasCredentials` is the replacement the UI actually needs: whether
// something is stored is answered by the database without the value ever
// leaving the repository.
const connectorColumns = {
  config: organizationConnectors.config,
  connectorKey: organizationConnectors.connectorKey,
  createdAt: organizationConnectors.createdAt,
  hasCredentials: sql<boolean>`${organizationConnectors.credentials} is not null`.as(
    "has_credentials",
  ),
  id: organizationConnectors.id,
  installedBy: organizationConnectors.installedBy,
  status: organizationConnectors.status,
  updatedAt: organizationConnectors.updatedAt,
};

export async function listOrganizationConnectors(db: Database, organizationId: string) {
  return db
    .select(connectorColumns)
    .from(organizationConnectors)
    .where(eq(organizationConnectors.organizationId, organizationId))
    .orderBy(asc(organizationConnectors.connectorKey));
}

export async function findOrganizationConnector(
  db: Database,
  organizationId: string,
  connectorKey: string,
) {
  const [installation] = await db
    .select(connectorColumns)
    .from(organizationConnectors)
    .where(
      and(
        eq(organizationConnectors.organizationId, organizationId),
        eq(organizationConnectors.connectorKey, connectorKey),
      ),
    )
    .limit(1);

  return installation;
}

// The only way to reach the encrypted credentials. Kept separate from the
// query above so that reading the secret is a caller's decision, not the
// default - whoever does not need it does not get it.
export async function findOrganizationConnectorSecrets(
  db: Database,
  organizationId: string,
  connectorKey: string,
) {
  const [installation] = await db
    .select({
      config: organizationConnectors.config,
      credentials: organizationConnectors.credentials,
      status: organizationConnectors.status,
    })
    .from(organizationConnectors)
    .where(
      and(
        eq(organizationConnectors.organizationId, organizationId),
        eq(organizationConnectors.connectorKey, connectorKey),
      ),
    )
    .limit(1);

  return installation;
}

// Installing and reconfiguring are the same operation: the operator enters
// what the connector should talk with. A separate "update" would have the
// same fields, the same validation, and a second way to set them.
//
// `credentials: undefined` does **not** mean "delete the credentials", it
// means "leave them as they are". Otherwise the UI would have to re-collect
// the secret on every small change - and the user would have to remember it.
export async function upsertOrganizationConnector(
  db: Database,
  input: {
    actorUserId: string;
    config: Record<string, string>;
    connectorKey: string;
    credentials?: string | undefined;
    organizationId: string;
    status?: "active" | "disabled";
  },
) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: organizationConnectors.id })
      .from(organizationConnectors)
      .where(
        and(
          eq(organizationConnectors.organizationId, input.organizationId),
          eq(organizationConnectors.connectorKey, input.connectorKey),
        ),
      )
      .limit(1);

    const [installation] = existing[0]
      ? await tx
          .update(organizationConnectors)
          .set({
            config: input.config,
            ...(input.credentials === undefined ? {} : { credentials: input.credentials }),
            ...(input.status === undefined ? {} : { status: input.status }),
            updatedAt: new Date(),
          })
          .where(eq(organizationConnectors.id, existing[0].id))
          .returning(connectorColumns)
      : await tx
          .insert(organizationConnectors)
          .values({
            organizationId: input.organizationId,
            connectorKey: input.connectorKey,
            config: input.config,
            credentials: input.credentials,
            status: input.status ?? "active",
            installedBy: input.actorUserId,
          })
          .returning(connectorColumns);
    if (!installation) throw new Error("Failed to save connector installation");

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: existing[0] ? "connector.updated" : "connector.installed",
      objectType: "connector",
      objectId: input.connectorKey,
      // Not `config` itself: which fields were set is what the log owes -
      // their values are the tenant's operational data and do not belong in a
      // row that lives on for a long time.
      changedProperties: Object.keys(input.config).concat(
        input.credentials === undefined ? [] : ["credentials"],
      ),
    });

    return installation;
  });
}

// --- Field mappings ---------------------------------------------------------

export type ConnectorFieldMappingInput = {
  collectionElementId?: string | undefined;
  collectionName?: string | undefined;
  dictionaryReference?: string | undefined;
  elementId?: string | undefined;
  sourceField: string;
  target: "ignore" | "attribute" | "element";
  unit?: string | undefined;
  visibility: "public" | "controlled";
};

export async function listConnectorFieldMappings(
  db: Database,
  organizationId: string,
  connectorKey: string,
  sourceType: string,
) {
  return db
    .select({
      collectionElementId: connectorFieldMappings.collectionElementId,
      collectionName: connectorFieldMappings.collectionName,
      dictionaryReference: connectorFieldMappings.dictionaryReference,
      elementId: connectorFieldMappings.elementId,
      sourceField: connectorFieldMappings.sourceField,
      target: connectorFieldMappings.target,
      unit: connectorFieldMappings.unit,
      visibility: connectorFieldMappings.visibility,
    })
    .from(connectorFieldMappings)
    .where(
      and(
        eq(connectorFieldMappings.organizationId, organizationId),
        eq(connectorFieldMappings.connectorKey, connectorKey),
        eq(connectorFieldMappings.sourceType, sourceType),
      ),
    )
    .orderBy(asc(connectorFieldMappings.sourceField));
}

// The submitted fields are set, the rest are left alone. A full replace would
// be wrong here: the preview shows the fields of *this one* record, and
// another record of the same type may carry fields that just did not appear
// here. Deleting them because a form did not mention them would be data loss
// without cause.
export async function saveConnectorFieldMappings(
  db: Database,
  input: {
    actorUserId: string;
    connectorKey: string;
    fields: ConnectorFieldMappingInput[];
    organizationId: string;
    sourceType: string;
  },
) {
  if (input.fields.length === 0) return;

  await db.transaction(async (tx) => {
    for (const field of input.fields) {
      await tx
        .insert(connectorFieldMappings)
        .values({
          organizationId: input.organizationId,
          connectorKey: input.connectorKey,
          sourceType: input.sourceType,
          sourceField: field.sourceField,
          target: field.target,
          dictionaryReference: field.dictionaryReference,
          elementId: field.elementId,
          collectionElementId: field.collectionElementId,
          collectionName: field.collectionName,
          visibility: field.visibility,
          unit: field.unit,
        })
        .onConflictDoUpdate({
          target: [
            connectorFieldMappings.organizationId,
            connectorFieldMappings.connectorKey,
            connectorFieldMappings.sourceType,
            connectorFieldMappings.sourceField,
          ],
          set: {
            target: field.target,
            dictionaryReference: field.dictionaryReference ?? null,
            elementId: field.elementId ?? null,
            collectionElementId: field.collectionElementId ?? null,
            collectionName: field.collectionName ?? null,
            visibility: field.visibility,
            unit: field.unit ?? null,
            updatedAt: new Date(),
          },
        });
    }

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "connector.mapping.saved",
      objectType: "connector",
      objectId: input.connectorKey,
      patch: { sourceType: input.sourceType },
      changedProperties: input.fields.map((field) => field.sourceField),
    });
  });
}

// That a catalog entry comes from an external system is recorded in its
// metadata - *who* fetched it from there, and when, is recorded only here.
// Product maintenance itself does not yet write an audit log; the import
// does, because it crosses the boundary to a foreign system and thereby
// raises the question an audit log exists to answer.
export async function recordConnectorImport(
  db: Database,
  input: {
    actorUserId: string;
    connectorKey: string;
    created: boolean;
    externalId: string;
    organizationId: string;
    productId: string;
  },
) {
  await db.insert(auditEvents).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    eventType: input.created ? "connector.product.imported" : "connector.product.refreshed",
    objectType: "product",
    objectId: input.productId,
    patch: { connector: input.connectorKey, externalId: input.externalId },
    changedProperties: ["name", "category", "identifiers", "metadata"],
  });
}

// Uninstalling deletes the row and, with it, the credentials. That is correct
// here, unlike for a revoked API key: keeping a foreign system's secret
// around after the tenant has removed the connector would be the opposite of
// what was requested. That it existed remains in the audit log.
export async function removeOrganizationConnector(
  db: Database,
  input: { actorUserId: string; connectorKey: string; organizationId: string },
) {
  return db.transaction(async (tx) => {
    const [installation] = await tx
      .delete(organizationConnectors)
      .where(
        and(
          eq(organizationConnectors.organizationId, input.organizationId),
          eq(organizationConnectors.connectorKey, input.connectorKey),
        ),
      )
      .returning(connectorColumns);
    if (!installation) return undefined;

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "connector.removed",
      objectType: "connector",
      objectId: input.connectorKey,
      changedProperties: ["status"],
    });

    return installation;
  });
}
