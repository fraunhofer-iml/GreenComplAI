import { and, asc, count, desc, eq, gt, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";

import { generateDppPublicId, isDppPublicId, nextVersionLabel } from "@dpp/domain";
import type { DppSnapshot, DppStatus } from "@dpp/domain";

import type { Database } from "../index.js";
import { auditEvents, dpps, dppVersions } from "../schema.js";
import { syncPublicBlobRelease } from "./blobs.js";

// A database handle inside a transaction; same query surface as Database.
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type CreateDppRecordInput = {
  actorUserId: string;
  organizationId: string;
  snapshot: DppSnapshot;
};

type PatchDppRecordInput = {
  actorUserId: string;
  dppId: string;
  organizationId: string;
  patch: unknown;
  snapshot: DppSnapshot;
  // Optional user override of the revision label; omitted keeps the current one.
  versionLabel?: string | undefined;
  // Optimistic concurrency guard: the update only applies if the row still has
  // this updatedAt, preventing lost updates from concurrent patches.
  expectedUpdatedAt: Date;
};

type TransitionDppStatusInput = {
  actorUserId: string;
  dppId: string;
  organizationId: string;
  status: DppStatus;
  comment?: string | undefined;
};

type ListDppsInput = {
  limit: number;
  offset: number;
  productIds?: string[] | undefined;
  search?: string | undefined;
  status?: DppStatus | undefined;
};

export async function createDppRecord(db: Database, input: CreateDppRecordInput) {
  // A fresh DPP starts its revision counter at <current year>.1.
  const versionLabel = nextVersionLabel([], new Date());

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(dpps)
      .values({
        organizationId: input.organizationId,
        digitalProductPassportId: input.snapshot.digitalProductPassportId,
        publicId: generateDppPublicId(),
        versionLabel,
        productId: input.snapshot.productId,
        granularity: input.snapshot.granularity,
        dppSchemaVersion: input.snapshot.dppSchemaVersion,
        status: input.snapshot.status,
        lastUpdate: new Date(input.snapshot.lastUpdate),
        economicOperatorId: input.snapshot.economicOperatorId,
        facilityId: input.snapshot.facilityId,
        currentSnapshot: input.snapshot,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create DPP");
    }

    await insertDppVersion(tx, {
      dppId: created.id,
      status: input.snapshot.status,
      snapshot: input.snapshot,
      actorUserId: input.actorUserId,
      versionLabel,
    });

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      dppId: created.id,
      actorUserId: input.actorUserId,
      eventType: "dpp.created",
      objectType: "dpp",
      objectId: created.digitalProductPassportId,
      changedProperties: ["currentSnapshot"],
    });

    return created;
  });
}

// Records that a DPP was read, satisfying prEN 18239 5.2 Nr.18 (all accesses to
// controlled data must be logged).
export async function recordDppAccess(
  db: Database,
  input: {
    organizationId: string;
    dppId: string;
    actorUserId: string;
    digitalProductPassportId: string;
  },
) {
  await db.insert(auditEvents).values({
    organizationId: input.organizationId,
    dppId: input.dppId,
    actorUserId: input.actorUserId,
    eventType: "dpp.read",
    objectType: "dpp",
    objectId: input.digitalProductPassportId,
  });
}

// Returns DPP identifiers whose productId is among the given set (prEN 18222
// 4.5 ReadDPPIdsByProductIds), with opaque cursor pagination over the DPP id.
export async function listDppIdsByProductIds(
  db: Database,
  organizationId: string,
  productIds: string[],
  options: { limit: number; cursor?: string | undefined },
) {
  if (productIds.length === 0) {
    return { ids: [] as string[], nextCursor: null as string | null };
  }

  const filters = [
    eq(dpps.organizationId, organizationId),
    inArray(dpps.productId, productIds),
    options.cursor ? gt(dpps.digitalProductPassportId, options.cursor) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({ id: dpps.digitalProductPassportId })
    .from(dpps)
    .where(and(...filters))
    .orderBy(asc(dpps.digitalProductPassportId))
    .limit(options.limit + 1);

  const hasMore = rows.length > options.limit;
  const page = hasMore ? rows.slice(0, options.limit) : rows;

  return {
    ids: page.map((row) => row.id),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

// Matches a route/API parameter against whichever identifier space it belongs
// to: the short public id used in URLs, or the canonical URN. The two can never
// overlap — a URN always contains ':', the Base58 public id never does — so
// accepting both is unambiguous and keeps norm-style calls (`urn:dpp:…`) and
// pretty URLs working against the same endpoints.
function matchesDppId(identifier: string) {
  return isDppPublicId(identifier)
    ? eq(dpps.publicId, identifier)
    : eq(dpps.digitalProductPassportId, identifier);
}

export async function findDppByDigitalId(
  db: Database,
  organizationId: string,
  digitalProductPassportId: string,
) {
  const [record] = await db
    .select()
    .from(dpps)
    .where(and(eq(dpps.organizationId, organizationId), matchesDppId(digitalProductPassportId)))
    .limit(1);

  return record;
}

export async function listDppRecords(db: Database, organizationId: string, input: ListDppsInput) {
  const filters = [
    eq(dpps.organizationId, organizationId),
    input.status ? eq(dpps.status, input.status) : undefined,
    input.productIds?.length ? inArray(dpps.productId, input.productIds) : undefined,
    input.search
      ? or(
          ilike(dpps.digitalProductPassportId, `%${input.search}%`),
          ilike(dpps.productId, `%${input.search}%`),
          ilike(dpps.economicOperatorId, `%${input.search}%`),
          ilike(dpps.facilityId, `%${input.search}%`),
        )
      : undefined,
  ].filter(Boolean);
  const where = and(...filters);

  const [rows, totalRows, statusRows] = await Promise.all([
    db
      .select({
        digitalProductPassportId: dpps.digitalProductPassportId,
        publicId: dpps.publicId,
        versionLabel: dpps.versionLabel,
        // Label of the version that is currently published, if any. Null and
        // dpps.versionLabel are different questions: a DPP can be `draft` on
        // 2026.2 while 2026.1 is still published (G62).
        publishedVersionLabel: dppVersions.versionLabel,
        dppSchemaVersion: dpps.dppSchemaVersion,
        economicOperatorId: dpps.economicOperatorId,
        facilityId: dpps.facilityId,
        granularity: dpps.granularity,
        lastUpdate: dpps.lastUpdate,
        productId: dpps.productId,
        status: dpps.status,
        updatedAt: dpps.updatedAt,
      })
      .from(dpps)
      // At most one row: active_version_id points at a single version.
      .leftJoin(dppVersions, eq(dppVersions.id, dpps.activeVersionId))
      .where(where)
      .orderBy(desc(dpps.updatedAt))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ value: count() }).from(dpps).where(where),
    db
      .select({ status: dpps.status, value: count() })
      .from(dpps)
      .where(eq(dpps.organizationId, organizationId))
      .groupBy(dpps.status),
  ]);

  return {
    dpps: rows,
    statusCounts: statusRows.reduce((counts, row) => ({ ...counts, [row.status]: row.value }), {
      archived: 0,
      draft: 0,
      published: 0,
      review: 0,
    } satisfies Record<DppStatus, number>),
    total: totalRows[0]?.value ?? 0,
  };
}

export async function findLatestDppByProductId(
  db: Database,
  organizationId: string,
  productId: string,
) {
  const [record] = await db
    .select()
    .from(dpps)
    .where(and(eq(dpps.organizationId, organizationId), eq(dpps.productId, productId)))
    .orderBy(desc(dpps.updatedAt))
    .limit(1);

  return record;
}

// The snapshot the public/QR surface should serve for a DPP: the currently
// ACTIVE published version — independent of the working `status`. This keeps a
// published version publicly reachable (and immutable) while a new revision is
// being drafted/reviewed. Falls back to the latest published version for rows
// where active_version_id has not been backfilled.
async function activePublicSnapshot(
  db: Database,
  row: { id: string; status: DppStatus; activeVersionId: string | null },
): Promise<DppSnapshot | undefined> {
  if (row.status === "archived") return undefined;

  if (row.activeVersionId) {
    const [version] = await db
      .select({ snapshot: dppVersions.snapshot })
      .from(dppVersions)
      .where(eq(dppVersions.id, row.activeVersionId))
      .limit(1);
    if (version) return version.snapshot as DppSnapshot;
  }

  const [latestPublished] = await db
    .select({ snapshot: dppVersions.snapshot })
    .from(dppVersions)
    .where(and(eq(dppVersions.dppId, row.id), eq(dppVersions.status, "published")))
    .orderBy(desc(dppVersions.versionNumber))
    .limit(1);
  return latestPublished ? (latestPublished.snapshot as DppSnapshot) : undefined;
}

// Resolves a productId to a publicly-available DPP for the public/QR resolver.
// Because a productId is only unique within an organization, the same string can
// exist in several tenants; rather than leak an arbitrary one, we detect the
// collision (`ambiguous`) so the caller can refuse and steer to the DPP-id URL.
export async function findPublicDppByProductId(db: Database, productId: string) {
  const rows = await db
    .select()
    .from(dpps)
    .where(and(eq(dpps.productId, productId), ne(dpps.status, "archived")))
    .orderBy(desc(dpps.updatedAt));

  const resolved: Array<(typeof rows)[number] & { publicSnapshot: DppSnapshot }> = [];
  for (const row of rows) {
    const publicSnapshot = await activePublicSnapshot(db, row);
    if (publicSnapshot) resolved.push({ ...row, publicSnapshot });
  }

  return { dpp: resolved[0], ambiguous: resolved.length > 1 };
}

export async function findPublicDppByDigitalId(db: Database, digitalProductPassportId: string) {
  const [row] = await db.select().from(dpps).where(matchesDppId(digitalProductPassportId)).limit(1);
  if (!row) return undefined;

  const publicSnapshot = await activePublicSnapshot(db, row);
  if (!publicSnapshot) return undefined;
  return { ...row, publicSnapshot };
}

// Version history for a DPP (by internal id), newest first. The full snapshot is
// omitted here to keep the list light — fetch it per version via
// getDppVersionSnapshot for detail/diff/restore.
// Whether another revision of this DPP already used `versionLabel`. Rows of the
// current revision all carry the current label, so comparing against it is what
// separates "renaming my own revision" from "colliding with an older one".
export async function isDppVersionLabelTaken(
  db: Database,
  dppInternalId: string,
  versionLabel: string,
  currentLabel: string,
): Promise<boolean> {
  if (versionLabel === currentLabel) return false;

  const [row] = await db
    .select({ id: dppVersions.id })
    .from(dppVersions)
    .where(and(eq(dppVersions.dppId, dppInternalId), eq(dppVersions.versionLabel, versionLabel)))
    .limit(1);

  return Boolean(row);
}

// Label of the version a DPP currently publishes, or undefined if none is
// active. Distinct from dpps.versionLabel, which names the *open* revision.
export async function findPublishedVersionLabel(
  db: Database,
  activeVersionId: string | null,
): Promise<string | undefined> {
  if (!activeVersionId) return undefined;

  const [row] = await db
    .select({ versionLabel: dppVersions.versionLabel })
    .from(dppVersions)
    .where(eq(dppVersions.id, activeVersionId))
    .limit(1);

  return row?.versionLabel;
}

// The version that was **published** at a given point in time (EN 18222
// Table 17 `ReadDPPVersionByProductIdAndDate`).
//
// Only published versions are candidates, which is the actual decision here:
// a draft that existed at the time was never the passport's statement.
// "What did this passport say on March 1" asks what someone could have read
// back then, not the work-in-progress state of whoever was editing it.
//
// Boundary: the comparison is `<=`, so a point in time exactly on a
// publication matches that one, not the one before it. Before the first
// publication there is no result - there was nothing to read yet.
export async function findPublishedVersionAtDate(db: Database, dppInternalId: string, at: Date) {
  const [record] = await db
    .select({
      versionNumber: dppVersions.versionNumber,
      versionLabel: dppVersions.versionLabel,
      status: dppVersions.status,
      snapshot: dppVersions.snapshot,
      createdBy: dppVersions.createdBy,
      createdAt: dppVersions.createdAt,
    })
    .from(dppVersions)
    .where(
      and(
        eq(dppVersions.dppId, dppInternalId),
        eq(dppVersions.status, "published"),
        lte(dppVersions.createdAt, at),
      ),
    )
    .orderBy(desc(dppVersions.createdAt), desc(dppVersions.versionNumber))
    .limit(1);

  return record;
}

export async function listDppVersions(db: Database, dppInternalId: string) {
  return db
    .select({
      versionNumber: dppVersions.versionNumber,
      versionLabel: dppVersions.versionLabel,
      status: dppVersions.status,
      createdBy: dppVersions.createdBy,
      createdAt: dppVersions.createdAt,
    })
    .from(dppVersions)
    .where(eq(dppVersions.dppId, dppInternalId))
    .orderBy(desc(dppVersions.versionNumber));
}

// Full version history including snapshots, oldest first — for computing the
// change feed (consecutive-version diffs).
export async function listDppVersionsWithSnapshots(db: Database, dppInternalId: string) {
  return db
    .select({
      versionNumber: dppVersions.versionNumber,
      status: dppVersions.status,
      createdBy: dppVersions.createdBy,
      createdAt: dppVersions.createdAt,
      snapshot: dppVersions.snapshot,
    })
    .from(dppVersions)
    .where(eq(dppVersions.dppId, dppInternalId))
    .orderBy(asc(dppVersions.versionNumber));
}

export async function getDppVersionSnapshot(
  db: Database,
  dppInternalId: string,
  versionNumber: number,
) {
  const [record] = await db
    .select()
    .from(dppVersions)
    .where(and(eq(dppVersions.dppId, dppInternalId), eq(dppVersions.versionNumber, versionNumber)))
    .limit(1);

  return record;
}

// Audit trail for a DPP (by internal id), newest first. Capped to a page; full
// pagination is deferred to the audit-export work.
export async function listDppAuditEvents(
  db: Database,
  dppInternalId: string,
  options: { limit?: number } = {},
) {
  return db
    .select({
      id: auditEvents.id,
      eventType: auditEvents.eventType,
      actorUserId: auditEvents.actorUserId,
      objectType: auditEvents.objectType,
      objectId: auditEvents.objectId,
      changedProperties: auditEvents.changedProperties,
      patch: auditEvents.patch,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.dppId, dppInternalId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(Math.min(options.limit ?? 200, 500));
}

export async function patchDppRecord(db: Database, input: PatchDppRecordInput) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(dpps)
      .set({
        currentSnapshot: input.snapshot,
        ...(input.versionLabel ? { versionLabel: input.versionLabel } : {}),
        granularity: input.snapshot.granularity,
        dppSchemaVersion: input.snapshot.dppSchemaVersion,
        economicOperatorId: input.snapshot.economicOperatorId,
        facilityId: input.snapshot.facilityId,
        lastUpdate: new Date(input.snapshot.lastUpdate),
        productId: input.snapshot.productId,
        status: input.snapshot.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dpps.id, input.dppId),
          eq(dpps.organizationId, input.organizationId),
          // Optimistic lock. `updated_at` is stored with microsecond
          // precision but the driver reads it back as a millisecond JS Date,
          // so compare at millisecond precision to avoid a false conflict on
          // every save. Bind the expected value as an ISO string (+cast), as a
          // raw Date has no codec inside a sql`` fragment.
          sql`date_trunc('milliseconds', ${dpps.updatedAt}) = ${input.expectedUpdatedAt.toISOString()}::timestamptz`,
        ),
      )
      .returning();

    if (!updated) {
      return undefined;
    }

    await insertDppVersion(tx, {
      dppId: input.dppId,
      status: input.snapshot.status,
      snapshot: input.snapshot,
      actorUserId: input.actorUserId,
      versionLabel: updated.versionLabel,
    });

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      dppId: input.dppId,
      actorUserId: input.actorUserId,
      eventType: "dpp.updated",
      objectType: "dpp",
      objectId: updated.digitalProductPassportId,
      patch: input.patch,
      changedProperties: ["currentSnapshot"],
    });

    return updated;
  });
}

// Deletes a passport (EN 18222 Table 17 `DeleteDPPById`).
//
// Only a **draft** is actually deleted, and only one that was never
// published. Everything else is archived instead of removed, for two
// reasons that both outweigh the convenience of a real delete:
//
//   * A published passport is a declaration that has been made. Its QR code
//     is stuck on products in circulation; removing it turns a reference
//     into an error, instead of turning a statement into a withdrawn one.
//   * Retention obligations and revision protection (G26) require that
//     published content stays traceable. A delete that takes the history
//     with it is exactly the opposite.
//
// A draft that was published before (an open revision) therefore falls into
// the second group - its history has been public.
export async function deleteDraftDppRecord(
  db: Database,
  input: { organizationId: string; dppId: string; actorUserId: string },
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dpps)
      .where(and(eq(dpps.organizationId, input.organizationId), matchesDppId(input.dppId)))
      .limit(1)
      .for("update");
    if (!existing) return { reason: "not-found" } as const;

    // `activeVersionId` is the evidence that this passport was published
    // before - even while it is a draft again right now.
    if (existing.status !== "draft" || existing.activeVersionId) {
      return { reason: "not-deletable", status: existing.status } as const;
    }

    // The audit event carries the DPP identifier in the **object field**, not
    // the foreign-key column: that gets set to `null` on delete
    // (ON DELETE SET NULL), so the event would otherwise not say which
    // passport was deleted. Hence `null` here right away, with the
    // identifier stored where it survives the deletion.
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      dppId: null,
      actorUserId: input.actorUserId,
      eventType: "dpp.deleted",
      objectType: "dpp",
      objectId: existing.digitalProductPassportId,
      changedProperties: ["deleted"],
    });

    await tx.delete(dpps).where(eq(dpps.id, existing.id));

    return {
      reason: "deleted",
      digitalProductPassportId: existing.digitalProductPassportId,
    } as const;
  });
}

export async function transitionDppRecordStatus(db: Database, input: TransitionDppStatusInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dpps)
      .where(and(eq(dpps.organizationId, input.organizationId), matchesDppId(input.dppId)))
      .limit(1)
      .for("update");
    if (!existing) {
      return undefined;
    }

    const snapshot = existing.currentSnapshot as DppSnapshot;
    const updatedSnapshot: DppSnapshot = {
      ...snapshot,
      status: input.status,
      lastUpdate: new Date().toISOString(),
    };

    // Archive a version on every status change (prEN 18222: all changes must
    // be archived), not only on publish.
    const versionId = await insertDppVersion(tx, {
      dppId: existing.id,
      status: input.status,
      snapshot: updatedSnapshot,
      actorUserId: input.actorUserId,
      versionLabel: existing.versionLabel,
    });

    // On publish, this version becomes the active, publicly served version and
    // its public projection is (re)computed. Other transitions leave the
    // previously published version untouched, so a DPP stays publicly reachable
    // while a new revision is drafted/reviewed.
    const publishFields =
      input.status === "published"
        ? { activeVersionId: versionId, publicProjection: buildPublicProjection(updatedSnapshot) }
        : {};

    const [updated] = await tx
      .update(dpps)
      .set({
        status: input.status,
        currentSnapshot: updatedSnapshot,
        lastUpdate: new Date(updatedSnapshot.lastUpdate),
        updatedAt: new Date(),
        ...publishFields,
      })
      .where(and(eq(dpps.id, existing.id), eq(dpps.organizationId, input.organizationId)))
      .returning();

    if (!updated) {
      return undefined;
    }

    // Public file access is derived from the public projections, so it is
    // recomputed on every transition — not just on publish: archiving or
    // drafting a DPP must revoke the files it used to publish.
    await syncPublicBlobRelease(tx, input.organizationId);

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      dppId: existing.id,
      actorUserId: input.actorUserId,
      eventType: statusToAuditEvent(input.status),
      objectType: "dpp",
      objectId: existing.digitalProductPassportId,
      changedProperties: ["status"],
      patch: input.comment ? { comment: input.comment } : undefined,
    });

    return updated;
  });
}

// Creates a new editable revision from a published DPP: the working status goes
// back to `draft` so it can be edited/reviewed again, while active_version_id and
// the public projection keep pointing at the published version — so the DPP stays
// publicly reachable and the published version stays immutable until the new
// revision is itself published.
export async function createDppRevisionRecord(
  db: Database,
  input: { organizationId: string; dppId: string; actorUserId: string },
): Promise<
  | { ok: true; snapshot: DppSnapshot; versionLabel: string }
  | { ok: false; reason: "not-found" | "not-published" }
> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dpps)
      .where(and(eq(dpps.organizationId, input.organizationId), matchesDppId(input.dppId)))
      .limit(1)
      .for("update");
    if (!existing) return { ok: false, reason: "not-found" } as const;
    // The invariant behind "exactly one editable revision" (G64): a revision can
    // only be opened from a published DPP, so a draft/review revision can never
    // be joined by a second one. The other way back into editing is
    // `review -> draft`, which reuses the same revision.
    if (existing.status !== "published") return { ok: false, reason: "not-published" } as const;

    // Auto-increment the revision label off everything the DPP has ever used,
    // restarting the sequence in a new year. Derived inside the transaction (the
    // row is locked FOR UPDATE) so two concurrent revisions cannot pick the same
    // label.
    const usedLabels = await tx
      .select({ versionLabel: dppVersions.versionLabel })
      .from(dppVersions)
      .where(eq(dppVersions.dppId, existing.id));
    const versionLabel = nextVersionLabel(
      [existing.versionLabel, ...usedLabels.map((row) => row.versionLabel)],
      new Date(),
    );

    const snapshot = existing.currentSnapshot as DppSnapshot;
    const draftSnapshot: DppSnapshot = {
      ...snapshot,
      status: "draft",
      lastUpdate: new Date().toISOString(),
    };

    const [updated] = await tx
      .update(dpps)
      .set({
        status: "draft",
        versionLabel,
        currentSnapshot: draftSnapshot,
        lastUpdate: new Date(draftSnapshot.lastUpdate),
        updatedAt: new Date(),
        // active_version_id and public_projection are intentionally left
        // unchanged: the previously published version stays active/public.
      })
      .where(and(eq(dpps.id, existing.id), eq(dpps.organizationId, input.organizationId)))
      .returning();
    if (!updated) return { ok: false, reason: "not-found" } as const;

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      dppId: existing.id,
      actorUserId: input.actorUserId,
      eventType: "dpp.revision_created",
      objectType: "dpp",
      objectId: existing.digitalProductPassportId,
      changedProperties: ["status", "versionLabel"],
      patch: { versionLabel },
    });

    return {
      ok: true,
      snapshot: updated.currentSnapshot as DppSnapshot,
      versionLabel: updated.versionLabel,
    } as const;
  });
}

// Inserts the next sequential version snapshot for a DPP within a transaction
// and returns the new version's id.
async function insertDppVersion(
  tx: Transaction,
  input: {
    dppId: string;
    status: DppStatus;
    snapshot: DppSnapshot;
    actorUserId: string;
    versionLabel: string;
  },
): Promise<string> {
  const [latestVersion] = await tx
    .select({ versionNumber: dppVersions.versionNumber })
    .from(dppVersions)
    .where(eq(dppVersions.dppId, input.dppId))
    .orderBy(desc(dppVersions.versionNumber))
    .limit(1);

  const [inserted] = await tx
    .insert(dppVersions)
    .values({
      dppId: input.dppId,
      versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
      versionLabel: input.versionLabel,
      status: input.status,
      snapshot: input.snapshot,
      createdBy: input.actorUserId,
    })
    .returning({ id: dppVersions.id });

  if (!inserted) throw new Error("Failed to insert DPP version");
  return inserted.id;
}

// Also used by the demo seed, which writes published DPPs straight into the
// table and has to produce the same projection a publish would.
export function buildPublicProjection(snapshot: DppSnapshot): DppSnapshot {
  return {
    ...snapshot,
    collections: snapshot.collections
      .filter(
        (collection) => collection.visibility === "public" && collection.publicEligible !== false,
      )
      .map((collection) => ({
        ...collection,
        dataElements: collection.dataElements.filter(
          (element) => element.visibility === "public" && element.publicEligible !== false,
        ),
      })),
    dataElements: snapshot.dataElements.filter(
      (element) => element.visibility === "public" && element.publicEligible !== false,
    ),
  };
}

function statusToAuditEvent(status: DppStatus) {
  const eventTypes = {
    archived: "dpp.archived",
    draft: "dpp.returned_to_draft",
    published: "dpp.published",
    review: "dpp.submitted_for_review",
  } as const satisfies Record<DppStatus, string>;

  return eventTypes[status];
}
