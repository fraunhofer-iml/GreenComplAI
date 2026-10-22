import { dpps, dppVersions } from "@dpp/db/schema";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../src/db.js";
import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp, publicElement, publishDpp } from "./helpers/dpp.js";

// / - the last two operations from EN 18222 Table 17.

const FACADE = "/en18222/v1";

type Messages = { messages: { code?: string; path?: string; text: string }[] };
type VersionAtDate = {
  createdAt: string;
  snapshot: { dataElements: { elementId: string; value?: unknown }[] };
  versionLabel: string;
};

// Version timestamps all land in the same second when a test creates them in
// quick succession. To test "before / after", they're pinned to fixed points
// afterward - the thing under test is the selection logic, not the clock.
async function stampVersion(publicId: string, versionNumber: number, at: Date) {
  const [dpp] = await db.select({ id: dpps.id }).from(dpps).where(eq(dpps.publicId, publicId));
  await db
    .update(dppVersions)
    .set({ createdAt: at })
    .where(and(eq(dppVersions.dppId, dpp!.id), eq(dppVersions.versionNumber, versionNumber)));
}

async function publishedVersionNumbers(publicId: string) {
  const [dpp] = await db.select({ id: dpps.id }).from(dpps).where(eq(dpps.publicId, publicId));
  return db
    .select({ versionNumber: dppVersions.versionNumber })
    .from(dppVersions)
    .where(and(eq(dppVersions.dppId, dpp!.id), eq(dppVersions.status, "published")));
}

describe("historical lookup and deletion (Tabelle 17)", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;

  beforeAll(async () => {
    organization = await createOrganization("history");
    editor = await addMember(organization, "editor");
  });

  describe("G15 — the version that was published at a point in time", () => {
    let publicId: string;
    let productId: string;
    const first = new Date("2026-03-01T10:00:00.000Z");
    const second = new Date("2026-06-01T10:00:00.000Z");

    beforeAll(async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("stand", "erste Fassung")],
      });
      publicId = dpp.publicId;
      productId = dpp.productId;

      await publishDpp(organization.admin, publicId);
      await organization.admin.post(`/dpps/${publicId}/revisions`);
      await organization.admin.patch(`/dpps/${publicId}`, {
        snapshot: { dataElements: [publicElement("stand", "zweite Fassung")] },
      });
      await publishDpp(organization.admin, publicId);

      const [older, newer] = await publishedVersionNumbers(publicId).then((rows) =>
        rows.map((row) => row.versionNumber).sort((a, b) => a - b),
      );
      await stampVersion(publicId, older!, first);
      await stampVersion(publicId, newer!, second);
    });

    it("answers with the fassung that was current then, not the newest", async () => {
      const response = await organization.admin.get<{ version: VersionAtDate }>(
        `/dpps/${publicId}/versions-at?date=2026-04-15T00:00:00Z`,
      );

      expect(response.status).toBe(200);
      expect(response.body.version.snapshot.dataElements[0]?.value).toBe("erste Fassung");
    });

    it("answers with the newer one after the second publication", async () => {
      const response = await organization.admin.get<{ version: VersionAtDate }>(
        `/dpps/${publicId}/versions-at?date=2026-08-01T00:00:00Z`,
      );

      expect(response.body.version.snapshot.dataElements[0]?.value).toBe("zweite Fassung");
    });

    // The boundary belongs to the version created at that instant: `<=`.
    // Otherwise the moment of publication would still have returned the old
    // state - a lie for one second.
    it("counts the exact instant of publication as the new version", async () => {
      const response = await organization.admin.get<{ version: VersionAtDate }>(
        `/dpps/${publicId}/versions-at?date=${second.toISOString()}`,
      );

      expect(response.body.version.snapshot.dataElements[0]?.value).toBe("zweite Fassung");
    });

    it("404s a point in time before the first publication", async () => {
      const response = await organization.admin.get<Messages>(
        `/dpps/${publicId}/versions-at?date=2026-01-01T00:00:00Z`,
      );

      expect(response.status).toBe(404);
      expect(response.body.messages[0]?.code).toBe("DPP_VERSION_NOT_FOUND");
    });

    // A draft is work in progress, not a statement of the passport. It must
    // not show up here even if it existed at that point in time.
    it("never answers with a draft, even one that existed then", async () => {
      const draftOnly = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("stand", "nur Entwurf")],
      });
      await stampVersion(draftOnly.publicId, 1, first);

      const response = await organization.admin.get(
        `/dpps/${draftOnly.publicId}/versions-at?date=2026-12-01T00:00:00Z`,
      );

      expect(response.status).toBe(404);
    });

    describe("the timestamp needs a timezone", () => {
      // Without a zone the same text is a different instant depending on the
      // reader - and here an hour decides which version answers.
      it("refuses a timestamp without one", async () => {
        const response = await organization.admin.get<Messages>(
          `/dpps/${publicId}/versions-at?date=2026-04-15T00:00:00`,
        );

        expect(response.status).toBe(422);
        expect(response.body.messages[0]?.path).toBe("date");
      });

      it("refuses a bare date", async () => {
        const response = await organization.admin.get(
          `/dpps/${publicId}/versions-at?date=2026-04-15`,
        );

        expect(response.status).toBe(422);
      });

      it("accepts an offset, not just Z", async () => {
        const response = await organization.admin.get(
          `/dpps/${publicId}/versions-at?date=${encodeURIComponent("2026-04-15T02:00:00+02:00")}`,
        );

        expect(response.status).toBe(200);
      });
    });

    it("is reachable through the facade under the norm's own path", async () => {
      const response = await organization.admin.get<{
        dataElements: { value?: unknown }[];
      }>(
        `${FACADE}/dppsByProductIdAndDate/${encodeURIComponent(productId)}?date=2026-04-15T00:00:00Z`,
      );

      expect(response.status).toBe(200);
      // Table 17 names the DPP as the result, not the version envelope around it.
      expect(response.body.dataElements[0]?.value).toBe("erste Fassung");
    });
  });

  describe("G16 — deletion", () => {
    it("deletes a draft that was never published", async () => {
      const dpp = await createDraftDpp(organization.admin, {});

      const response = await organization.admin.delete(`/dpps/${dpp.publicId}`);

      expect(response.status).toBe(200);
      expect((await organization.admin.get(`/dpps/${dpp.publicId}`)).status).toBe(404);
    });

    it("refuses a published passport and points at archiving instead", async () => {
      const dpp = await createDraftDpp(organization.admin, {});
      await publishDpp(organization.admin, dpp.publicId);

      const response = await organization.admin.delete<Messages>(`/dpps/${dpp.publicId}`);

      expect(response.status).toBe(409);
      expect(response.body.messages[0]?.code).toBe("DPP_NOT_DELETABLE");
      expect(response.body.messages[0]?.text).toContain("Archive");
    });

    // The case that easily slips through: the passport **is** currently a
    // draft, but it was published before. Its history is out there.
    it("refuses an open revision of a passport that was published before", async () => {
      const dpp = await createDraftDpp(organization.admin, {});
      await publishDpp(organization.admin, dpp.publicId);
      await organization.admin.post(`/dpps/${dpp.publicId}/revisions`);

      const view = await organization.admin.get<{ view: { dpp: { status: string } } }>(
        `/dpps/${dpp.publicId}/view`,
      );
      expect(view.body.view.dpp.status).toBe("draft");

      const response = await organization.admin.delete(`/dpps/${dpp.publicId}`);
      expect(response.status).toBe(409);
    });

    it("refuses an archived passport", async () => {
      const dpp = await createDraftDpp(organization.admin, {});
      await publishDpp(organization.admin, dpp.publicId);
      await organization.admin.put(`/dpps/${dpp.publicId}/status`, { status: "archived" });

      expect((await organization.admin.delete(`/dpps/${dpp.publicId}`)).status).toBe(409);
    });

    it("is reserved for admins", async () => {
      const dpp = await createDraftDpp(organization.admin, {});

      expect((await editor.delete(`/dpps/${dpp.publicId}`)).status).toBe(403);
    });

    it("hides another tenant's passport", async () => {
      const dpp = await createDraftDpp(organization.admin, {});
      const rival = await createOrganization("history-rival");

      expect((await rival.admin.delete(`/dpps/${dpp.publicId}`)).status).toBe(404);
      // And the passport is still there.
      expect((await organization.admin.get(`/dpps/${dpp.publicId}`)).status).toBe(200);
    });

    // The deletion itself must stay traceable - otherwise the fact that the
    // passport ever existed disappears along with it.
    it("leaves an audit entry that survives the row", async () => {
      const dpp = await createDraftDpp(organization.admin, {});
      const before = await organization.admin.get<{ dpp: { digitalProductPassportId: string } }>(
        `/dpps/${dpp.publicId}`,
      );

      await organization.admin.delete(`/dpps/${dpp.publicId}`);

      const events = await db.query.auditEvents.findMany({
        where: (event, { and: every, eq: is }) =>
          every(
            is(event.organizationId, organization.id),
            is(event.eventType, "dpp.deleted"),
            is(event.objectId, before.body.dpp.digitalProductPassportId),
          ),
      });

      expect(events.length).toBe(1);
    });

    it("is reachable through the facade", async () => {
      const dpp = await createDraftDpp(organization.admin, {});

      const response = await organization.admin.delete(`${FACADE}/dpps/${dpp.publicId}`);

      expect(response.status).toBe(200);
      expect((await organization.admin.get(`/dpps/${dpp.publicId}`)).status).toBe(404);
    });
  });
});
