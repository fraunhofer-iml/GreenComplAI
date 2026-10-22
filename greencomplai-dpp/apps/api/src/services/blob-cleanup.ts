import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import {
  deleteBlobObjects,
  findOrphanBlobObjects,
  listOrganizationIds,
  listReferencedBlobIds,
} from "@dpp/db";

import { env } from "../config.js";
import { db } from "../db.js";
import { s3 } from "../storage.js";

export type CleanupSummary = { deleted: number; organizationId: string };

// Sweeps uploads that no DPP snapshot references any more — a file picked in the
// editor and then never saved, or one whose element was removed.
//
// Two rules keep this from deleting live data:
//   - the grace period: a blob uploaded minutes ago may belong to a draft that is
//     still open in someone's editor and not saved yet;
//   - referenced ids include *historical versions*, not just current snapshots,
//     because restoring an old version must still resolve its documents.
export async function cleanupOrphanBlobs(organizationId: string): Promise<CleanupSummary> {
  const olderThan = new Date(Date.now() - env.BLOB_ORPHAN_GRACE_HOURS * 60 * 60 * 1000);
  const referencedBlobIds = await listReferencedBlobIds(db, organizationId);

  const orphans = await findOrphanBlobObjects(db, {
    organizationId,
    olderThan,
    referencedBlobIds,
  });
  if (orphans.length === 0) return { deleted: 0, organizationId };

  // Storage first: a row without an object is a broken reference, an object
  // without a row is merely wasted bytes the next sweep would not even see. The
  // cheaper failure is the one to risk.
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: env.S3_BUCKET,
      Delete: { Objects: orphans.map((orphan) => ({ Key: orphan.storageKey })) },
    }),
  );

  const deleted = await deleteBlobObjects(
    db,
    organizationId,
    orphans.map((orphan) => orphan.id),
  );

  return { deleted, organizationId };
}

export async function cleanupOrphanBlobsForAllOrganizations(): Promise<CleanupSummary[]> {
  const organizationIds = await listOrganizationIds(db);
  const summaries: CleanupSummary[] = [];

  for (const organizationId of organizationIds) {
    try {
      summaries.push(await cleanupOrphanBlobs(organizationId));
    } catch (error) {
      // One tenant's storage problem must not stop the sweep for the others.
      console.error(`[cleanup] Orphan sweep failed for organization ${organizationId}`, error);
    }
  }

  return summaries;
}
