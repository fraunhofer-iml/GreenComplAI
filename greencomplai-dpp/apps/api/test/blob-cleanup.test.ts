import { randomUUID } from "node:crypto";

import { blobObjects } from "@dpp/db/schema";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { env } from "../src/config.js";
import { db } from "../src/db.js";
import { createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { createDraftDpp, publishDpp } from "./helpers/dpp.js";

// The sweep talks to object storage; the suite only brings up Postgres, so the
// delete call is stubbed. What is under test is *which* blobs it selects — the
// part that can destroy data.
vi.mock("../src/storage.js", () => ({
  s3: { send: vi.fn().mockResolvedValue({}) },
}));

const { cleanupOrphanBlobs } = await import("../src/services/blob-cleanup.js");

// Inserts a blob row directly: uploading through the API would need MinIO, and
// the row is all the sweep looks at.
async function insertBlob(
  organizationId: string,
  createdBy: string,
  ageHours: number,
): Promise<string> {
  const [row] = await db
    .insert(blobObjects)
    .values({
      organizationId,
      storageKey: `org/${organizationId}/blobs/${randomUUID()}`,
      filename: "datasheet.pdf",
      contentType: "application/pdf",
      size: 1024,
      checksum: `sha256:${randomUUID()}`,
      createdBy,
      createdAt: new Date(Date.now() - ageHours * 60 * 60 * 1000),
    })
    .returning({ id: blobObjects.id });

  return row!.id;
}

const documentElement = (blobObjectId: string) => ({
  elementId: "datasheet",
  kind: "document" as const,
  blobObjectId,
  filename: "datasheet.pdf",
  contentType: "application/pdf",
  visibility: "public" as const,
});

const exists = async (blobId: string) =>
  (await db.select().from(blobObjects).where(eq(blobObjects.id, blobId))).length > 0;

describe("orphan blob cleanup", () => {
  let organization: OrganizationFixture;
  const oldEnough = env.BLOB_ORPHAN_GRACE_HOURS + 1;

  beforeAll(async () => {
    organization = await createOrganization("cleanup");
  });

  it("deletes an upload no snapshot ever referenced", async () => {
    const orphan = await insertBlob(organization.id, organization.admin.user.id, oldEnough);

    const summary = await cleanupOrphanBlobs(organization.id);

    expect(summary.deleted).toBeGreaterThanOrEqual(1);
    expect(await exists(orphan)).toBe(false);
  });

  it("spares a recent upload still within the grace period", async () => {
    // Someone has the file in an open editor and has not saved yet.
    const fresh = await insertBlob(organization.id, organization.admin.user.id, 1);

    await cleanupOrphanBlobs(organization.id);

    expect(await exists(fresh)).toBe(true);
  });

  it("spares a blob a draft references", async () => {
    const blobId = await insertBlob(organization.id, organization.admin.user.id, oldEnough);
    await createDraftDpp(organization.admin, { dataElements: [documentElement(blobId)] });

    await cleanupOrphanBlobs(organization.id);

    expect(await exists(blobId)).toBe(true);
  });

  // The dangerous case: the element is gone from the *current* snapshot, but an
  // archived version still points at it. Deleting it would break restoring that
  // version, and the version list would render a dead document link.
  it("spares a blob only a historical version references", async () => {
    const blobId = await insertBlob(organization.id, organization.admin.user.id, oldEnough);
    const dpp = await createDraftDpp(organization.admin, {
      dataElements: [documentElement(blobId)],
    });
    // Remove the reference from the working snapshot; history keeps it.
    await organization.admin.patch(`/dpps/${dpp.publicId}`, { snapshot: { dataElements: [] } });

    await cleanupOrphanBlobs(organization.id);

    expect(await exists(blobId)).toBe(true);
  });

  it("spares a blob a published version references", async () => {
    const blobId = await insertBlob(organization.id, organization.admin.user.id, oldEnough);
    const dpp = await createDraftDpp(organization.admin, {
      dataElements: [documentElement(blobId)],
    });
    await publishDpp(organization.admin, dpp.publicId);

    await cleanupOrphanBlobs(organization.id);

    expect(await exists(blobId)).toBe(true);
  });

  it("does not touch another tenant's orphans", async () => {
    const other = await createOrganization("cleanup-rival");
    const foreign = await insertBlob(other.id, other.admin.user.id, oldEnough);

    await cleanupOrphanBlobs(organization.id);

    expect(await exists(foreign)).toBe(true);
  });
});
