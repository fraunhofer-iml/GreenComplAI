import { and, eq, inArray, isNotNull, lt, ne, notInArray, sql } from "drizzle-orm";

import { collectPublicBlobIds, collectReferencedBlobIds } from "@dpp/domain";
import type { DppSnapshot } from "@dpp/domain";

import type { Database } from "../index.js";
import { auditEvents, blobObjects, dpps, dppVersions } from "../schema.js";

// A database handle inside a transaction; same query surface as Database.
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Blob ids reach these queries as plain strings: from a URL path, or out of a
// DPP snapshot, where `blobObjectId` is any non-empty string. The columns they
// are matched against are `uuid`, and Postgres answers a malformed value with an
// error instead of an empty result - so one hand-written or imported id would
// turn a lookup into a 500 rather than a 404. Screening the ids first makes an
// id that cannot exist what it is: no match.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function uuidsOnly(values: string[]): string[] {
  return values.filter(isUuid);
}

type CreateBlobObjectInput = {
  actorUserId: string;
  checksum: string;
  contentType: string;
  filename: string;
  organizationId: string;
  size: number;
  storageKey: string;
};

export async function createBlobObject(db: Database, input: CreateBlobObjectInput) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(blobObjects)
      .values({
        organizationId: input.organizationId,
        storageKey: input.storageKey,
        filename: input.filename,
        contentType: input.contentType,
        size: input.size,
        checksum: input.checksum,
        // Uploads start private. Public availability is granted only by
        // publishing a DPP whose public projection references the blob.
        isPublic: false,
        createdBy: input.actorUserId,
      })
      .returning();

    if (!created) throw new Error("Failed to insert blob object");

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "blob.uploaded",
      objectType: "blob",
      objectId: created.id,
      patch: {
        filename: created.filename,
        contentType: created.contentType,
        size: created.size,
        checksum: created.checksum,
      },
    });

    return created;
  });
}

// Tenant-scoped lookup: a blob is only ever reachable through the organization
// that owns it, never by id alone.
export async function findBlobObject(db: Database, organizationId: string, blobId: string) {
  if (!isUuid(blobId)) return undefined;

  const [row] = await db
    .select()
    .from(blobObjects)
    .where(and(eq(blobObjects.id, blobId), eq(blobObjects.organizationId, organizationId)))
    .limit(1);

  return row;
}

// Which of the given blob ids belong to this tenant — one query instead of
// one per reference, since a snapshot can carry an arbitrary number of documents.
export async function listOwnBlobIds(db: Database, organizationId: string, blobIds: string[]) {
  const candidates = uuidsOnly(blobIds);
  if (candidates.length === 0) return new Set<string>();

  const rows = await db
    .select({ id: blobObjects.id })
    .from(blobObjects)
    .where(
      and(eq(blobObjects.organizationId, organizationId), inArray(blobObjects.id, candidates)),
    );

  return new Set(rows.map((row) => row.id));
}

// Anonymous lookup for the public viewer: only blobs explicitly released by a
// publish are reachable, and the tenant is deliberately not part of the key
// because the caller has no organization context.
export async function findPublicBlobObject(db: Database, blobId: string) {
  if (!isUuid(blobId)) return undefined;

  const [row] = await db
    .select()
    .from(blobObjects)
    .where(and(eq(blobObjects.id, blobId), eq(blobObjects.isPublic, true)))
    .limit(1);

  return row;
}

// Working snapshots of the tenant's non-archived DPPs that reference this blob.
// The SQL `like` only narrows the candidate rows cheaply; whether a snapshot
// really references the blob (and whether the caller may read it) is decided on
// the parsed snapshot by the caller, so correctness does not rest on the match.
export async function listSnapshotsReferencingBlob(
  db: Database,
  organizationId: string,
  blobId: string,
): Promise<DppSnapshot[]> {
  const rows = await db
    .select({ snapshot: dpps.currentSnapshot })
    .from(dpps)
    .where(
      and(
        eq(dpps.organizationId, organizationId),
        ne(dpps.status, "archived"),
        sql`${dpps.currentSnapshot}::text like ${`%${blobId}%`}`,
      ),
    );

  return rows.map((row) => row.snapshot as DppSnapshot);
}

export async function recordBlobDownload(
  db: Database,
  input: { actorUserId: string; blobId: string; organizationId: string },
) {
  await db.insert(auditEvents).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    eventType: "blob.downloaded",
    objectType: "blob",
    objectId: input.blobId,
  });
}

// Recomputes, for one tenant, which blobs are publicly downloadable: exactly
// those referenced as a document by the public projection of a non-archived DPP
// with an active published version. `isPublic` is therefore a derived cache of
// what is actually served publicly and cannot drift from it — a file becomes
// public only by publishing, and loses that the moment the referencing element
// turns `controlled`, the DPP is archived, or the reference is removed.
//
// Runs inside the status-transition transaction and rescans the tenant's
// published DPPs rather than diffing one projection, so a blob shared by two
// DPPs is not revoked while the other still publishes it.
export async function syncPublicBlobRelease(tx: Transaction, organizationId: string) {
  const rows = await tx
    .select({ publicProjection: dpps.publicProjection })
    .from(dpps)
    .where(
      and(
        eq(dpps.organizationId, organizationId),
        isNotNull(dpps.activeVersionId),
        ne(dpps.status, "archived"),
      ),
    );

  const referenced = new Set<string>();
  for (const row of rows) {
    if (!row.publicProjection) continue;
    for (const blobId of collectPublicBlobIds(row.publicProjection as DppSnapshot)) {
      referenced.add(blobId);
    }
  }

  const referencedIds = uuidsOnly([...referenced]);

  if (referencedIds.length > 0) {
    await tx
      .update(blobObjects)
      .set({ isPublic: true })
      .where(
        and(eq(blobObjects.organizationId, organizationId), inArray(blobObjects.id, referencedIds)),
      );
  }

  const revokeConditions = [
    eq(blobObjects.organizationId, organizationId),
    eq(blobObjects.isPublic, true),
  ];
  if (referencedIds.length > 0) {
    revokeConditions.push(notInArray(blobObjects.id, referencedIds));
  }

  await tx
    .update(blobObjects)
    .set({ isPublic: false })
    .where(and(...revokeConditions));
}

// Orphans are uploads that were never referenced by any DPP snapshot and are
// older than the grace period (an upload that is still being edited into a draft
// must not be swept). Referenced ids are passed in by the caller, which knows the
// snapshot shape.
export async function findOrphanBlobObjects(
  db: Database,
  input: { organizationId: string; olderThan: Date; referencedBlobIds: string[] },
) {
  const conditions = [
    eq(blobObjects.organizationId, input.organizationId),
    lt(blobObjects.createdAt, input.olderThan),
  ];
  const referencedIds = uuidsOnly(input.referencedBlobIds);
  if (referencedIds.length > 0) {
    conditions.push(notInArray(blobObjects.id, referencedIds));
  }

  return db
    .select({ id: blobObjects.id, storageKey: blobObjects.storageKey })
    .from(blobObjects)
    .where(and(...conditions));
}

export async function deleteBlobObjects(db: Database, organizationId: string, blobIds: string[]) {
  if (blobIds.length === 0) return 0;

  const deleted = await db
    .delete(blobObjects)
    .where(and(eq(blobObjects.organizationId, organizationId), inArray(blobObjects.id, blobIds)))
    .returning({ id: blobObjects.id });

  return deleted.length;
}

// Sum of stored bytes per tenant; feeds storage quotas/entitlements.
export async function sumBlobBytes(db: Database, organizationId: string) {
  const [row] = await db
    .select({ bytes: sql<number>`coalesce(sum(${blobObjects.size}), 0)::bigint` })
    .from(blobObjects)
    .where(eq(blobObjects.organizationId, organizationId));

  return Number(row?.bytes ?? 0);
}

// Every blob id still referenced by this tenant — by the working snapshot of any
// DPP *and* by any archived version. Historical versions count: a restore or a
// version detail view must still resolve its documents, so a blob that only an
// old version points at is in use, not orphaned.
export async function listReferencedBlobIds(
  db: Database,
  organizationId: string,
): Promise<string[]> {
  const [current, historical] = await Promise.all([
    db
      .select({ snapshot: dpps.currentSnapshot })
      .from(dpps)
      .where(eq(dpps.organizationId, organizationId)),
    db
      .select({ snapshot: dppVersions.snapshot })
      .from(dppVersions)
      .innerJoin(dpps, eq(dpps.id, dppVersions.dppId))
      .where(eq(dpps.organizationId, organizationId)),
  ]);

  const referenced = new Set<string>();
  for (const row of [...current, ...historical]) {
    if (!row.snapshot) continue;
    for (const blobId of collectReferencedBlobIds(row.snapshot as DppSnapshot)) {
      referenced.add(blobId);
    }
  }

  return [...referenced];
}
