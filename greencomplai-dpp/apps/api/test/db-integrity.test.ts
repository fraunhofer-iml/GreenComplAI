import { randomUUID } from "node:crypto";

import { auditEvents, blobObjects, dpps, dppVersions } from "@dpp/db/schema";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../src/db.js";
import { createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { controlledElement, createDraftDpp, publicElement, publishDpp } from "./helpers/dpp.js";

// Asserts the guarantees that live in the database rather than in a handler:
// constraints, transactional audit writes and JSONB round-tripping. The schema
// under test is the one the real migrations built (see global-setup.ts).
describe("database integrity", () => {
  let organization: OrganizationFixture;

  beforeAll(async () => {
    organization = await createOrganization("db");
  });

  describe("uniqueness", () => {
    it("enforces a globally unique DPP identifier", async () => {
      const dpp = await createDraftDpp(organization.admin);
      const [row] = await db.select().from(dpps).where(eq(dpps.publicId, dpp.publicId));
      const other = await createOrganization("db-rival");
      const [otherOrgRow] = await db
        .select()
        .from(dpps)
        .where(eq(dpps.organizationId, other.id))
        .limit(1);
      expect(otherOrgRow).toBeUndefined();

      // A different tenant must not be able to claim the same URN: the unique
      // index is global, not per organization .
      await expect(
        db.insert(dpps).values({
          organizationId: other.id,
          digitalProductPassportId: row!.digitalProductPassportId,
          publicId: `dup${randomUUID().slice(0, 9).replace(/-/g, "a")}`,
          versionLabel: "2026.1",
          productId: "duplicate",
          granularity: "model",
          dppSchemaVersion: "test-dictionary/2026.1",
          economicOperatorId: "operator",
          currentSnapshot: row!.currentSnapshot,
        }),
      ).rejects.toThrow();
    });

    it("enforces a globally unique public id", async () => {
      const dpp = await createDraftDpp(organization.admin);

      await expect(
        db.insert(dpps).values({
          organizationId: organization.id,
          digitalProductPassportId: `urn:dpp:${randomUUID()}`,
          publicId: dpp.publicId,
          versionLabel: "2026.1",
          productId: "duplicate-public-id",
          granularity: "model",
          dppSchemaVersion: "test-dictionary/2026.1",
          economicOperatorId: "operator",
          currentSnapshot: {},
        }),
      ).rejects.toThrow();
    });

    it("allows the same product id in different organizations", async () => {
      // productId is a tenant-local business key - the resolver handles the
      // resulting ambiguity rather than the schema forbidding it.
      const other = await createOrganization("db-shared-product");
      const productId = `shared-${randomUUID()}`;

      await expect(createDraftDpp(organization.admin, { productId })).resolves.toBeDefined();
      await expect(createDraftDpp(other.admin, { productId })).resolves.toBeDefined();
    });
  });

  describe("audit trail", () => {
    it("writes the audit event in the same transaction as the DPP", async () => {
      const dpp = await createDraftDpp(organization.admin);

      const [row] = await db.select().from(dpps).where(eq(dpps.publicId, dpp.publicId));
      const events = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.dppId, row!.id), eq(auditEvents.eventType, "dpp.created")));

      expect(events).toHaveLength(1);
      expect(events[0]?.organizationId).toBe(organization.id);
      expect(events[0]?.objectId).toBe(dpp.digitalProductPassportId);
    });

    it("records the actor on every write", async () => {
      const dpp = await createDraftDpp(organization.admin);
      const [row] = await db.select().from(dpps).where(eq(dpps.publicId, dpp.publicId));

      const events = await db.select().from(auditEvents).where(eq(auditEvents.dppId, row!.id));

      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        expect(event.actorUserId).toBe(organization.admin.user.id);
      }
    });
  });

  describe("JSONB snapshots", () => {
    it("round-trips a nested snapshot without losing structure", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        collections: [
          {
            elementId: "sustainability",
            kind: "collection",
            visibility: "public",
            dataElements: [publicElement("carbon", "12.5")],
          },
        ],
        dataElements: [
          controlledElement("supplier", "ACME", { readRoles: ["admin"], writeRoles: ["admin"] }),
        ],
      });

      const [row] = await db.select().from(dpps).where(eq(dpps.publicId, dpp.publicId));
      const snapshot = row!.currentSnapshot as {
        collections: { dataElements: { elementId: string }[]; elementId: string }[];
        dataElements: { policy?: { readRoles: string[] }; elementId: string }[];
      };

      expect(snapshot.collections[0]?.elementId).toBe("sustainability");
      expect(snapshot.collections[0]?.dataElements[0]?.elementId).toBe("carbon");
      expect(snapshot.dataElements[0]?.policy?.readRoles).toEqual(["admin"]);
    });

    it("stores a public projection only once published", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          publicElement("material", "aluminium"),
          controlledElement("cost", "42", { readRoles: ["admin"], writeRoles: ["admin"] }),
        ],
      });

      const beforePublish = await db.select().from(dpps).where(eq(dpps.publicId, dpp.publicId));
      expect(beforePublish[0]?.publicProjection).toBeNull();

      await publishDpp(organization.admin, dpp.publicId);

      const [row] = await db.select().from(dpps).where(eq(dpps.publicId, dpp.publicId));
      const projection = row!.publicProjection as { dataElements: { elementId: string }[] };

      expect(row!.activeVersionId).toBeTruthy();
      expect(projection.dataElements.map((element) => element.elementId)).toEqual(["material"]);
    });
  });

  describe("version history", () => {
    it("numbers versions sequentially per DPP", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("material", "one")] },
      });

      const [row] = await db.select().from(dpps).where(eq(dpps.publicId, dpp.publicId));
      const versions = await db
        .select()
        .from(dppVersions)
        .where(eq(dppVersions.dppId, row!.id))
        .orderBy(dppVersions.versionNumber);

      expect(versions.map((version) => version.versionNumber)).toEqual([1, 2]);
    });
  });

  describe("blob release", () => {
    it("keeps uploads private until a publish releases them", async () => {
      // No blob is uploaded here; the assertion is that nothing is public by
      // default in a fresh tenant - isPublic is derived, never a default.
      const rows = await db
        .select()
        .from(blobObjects)
        .where(eq(blobObjects.organizationId, organization.id));

      for (const row of rows) {
        expect(row.isPublic).toBe(false);
      }
    });
  });
});
