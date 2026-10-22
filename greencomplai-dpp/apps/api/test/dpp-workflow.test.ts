import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp, publicElement, publishDpp } from "./helpers/dpp.js";

type ViewPayload = {
  view: {
    dpp: { status: string };
    publishedVersionLabel?: string;
    versionLabel: string;
  };
};

// The label year comes from the server clock, so the expectation has to as well —
// hardcoding it would turn this suite red on New Year's Eve.
const currentYear = new Date().getFullYear();

describe("DPP lifecycle", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;
  let viewer: TestClient;

  beforeAll(async () => {
    organization = await createOrganization("workflow");
    editor = await addMember(organization, "editor");
    viewer = await addMember(organization, "viewer");
  });

  const view = (client: TestClient, dppId: string) =>
    client.get<ViewPayload>(`/dpps/${dppId}/view`);

  describe("status transitions", () => {
    it("walks draft -> review -> published", async () => {
      const dpp = await createDraftDpp(organization.admin);

      expect((await view(organization.admin, dpp.publicId)).body.view.dpp.status).toBe("draft");

      expect(
        (await organization.admin.put(`/dpps/${dpp.publicId}/status`, { status: "review" })).status,
      ).toBe(200);
      expect((await view(organization.admin, dpp.publicId)).body.view.dpp.status).toBe("review");

      expect(
        (await organization.admin.put(`/dpps/${dpp.publicId}/status`, { status: "published" }))
          .status,
      ).toBe(200);
      expect((await view(organization.admin, dpp.publicId)).body.view.dpp.status).toBe("published");
    });

    it("refuses to skip review", async () => {
      const dpp = await createDraftDpp(organization.admin);

      const response = await organization.admin.put(`/dpps/${dpp.publicId}/status`, {
        status: "published",
      });

      expect(response.status).toBe(409);
    });

    it("lets a review go back to draft", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await organization.admin.put(`/dpps/${dpp.publicId}/status`, { status: "review" });

      expect((await editor.put(`/dpps/${dpp.publicId}/status`, { status: "draft" })).status).toBe(
        200,
      );
      expect((await view(organization.admin, dpp.publicId)).body.view.dpp.status).toBe("draft");
    });

    it("reserves publishing for admins (four-eyes)", async () => {
      const dpp = await createDraftDpp(editor);
      await editor.put(`/dpps/${dpp.publicId}/status`, { status: "review" });

      const response = await editor.put(`/dpps/${dpp.publicId}/status`, { status: "published" });

      expect(response.status).toBe(403);
    });

    it("does not let a viewer create a DPP", async () => {
      const response = await viewer.post("/dpps", {
        productId: "viewer-attempt",
        granularity: "model",
        dppSchemaVersion: "test-dictionary/2026.1",
        economicOperatorId: "operator",
      });

      expect(response.status).toBe(403);
    });

    it("does not let a published DPP be patched", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await publishDpp(organization.admin, dpp.publicId);

      const response = await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { granularity: "changed" },
      });

      expect(response.status).toBe(409);
    });
  });

  describe("revisions and version labels", () => {
    it("starts a fresh DPP at .1 of the current year", async () => {
      const dpp = await createDraftDpp(organization.admin);

      const payload = await view(organization.admin, dpp.publicId);

      expect(payload.body.view.versionLabel).toBe(`${currentYear}.1`);
      expect(payload.body.view.publishedVersionLabel).toBeUndefined();
    });

    it("increments the label when a revision is opened", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await publishDpp(organization.admin, dpp.publicId);

      expect((await organization.admin.post(`/dpps/${dpp.publicId}/revisions`)).status).toBe(201);

      const payload = await view(organization.admin, dpp.publicId);
      expect(payload.body.view.versionLabel).toBe(`${currentYear}.2`);
    });

    // The bug this whole feature came from: a revision made the passport look
    // like an unpublished draft, even though its published version was still live.
    it("reports the published version alongside the open revision", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await publishDpp(organization.admin, dpp.publicId);
      await organization.admin.post(`/dpps/${dpp.publicId}/revisions`);

      const payload = await view(organization.admin, dpp.publicId);

      expect(payload.body.view.dpp.status).toBe("draft");
      expect(payload.body.view.versionLabel).toBe(`${currentYear}.2`);
      expect(payload.body.view.publishedVersionLabel).toBe(`${currentYear}.1`);
    });

    it("only opens a revision from a published DPP", async () => {
      const dpp = await createDraftDpp(organization.admin);

      const response = await organization.admin.post(`/dpps/${dpp.publicId}/revisions`);

      // The invariant behind "exactly one editable revision": a second one can
      // never be opened next to an in-flight draft.
      expect(response.status).toBe(409);
    });

    it("accepts a user override of the label", async () => {
      const dpp = await createDraftDpp(organization.admin);

      const response = await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("material", "steel")] },
        versionLabel: `${currentYear}.7`,
      });

      expect(response.status).toBe(200);
      expect((await view(organization.admin, dpp.publicId)).body.view.versionLabel).toBe(
        `${currentYear}.7`,
      );
    });

    it("rejects a label an earlier revision already used", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await publishDpp(organization.admin, dpp.publicId);
      await organization.admin.post(`/dpps/${dpp.publicId}/revisions`);

      const response = await organization.admin.patch<{ messages: { code: string }[] }>(
        `/dpps/${dpp.publicId}`,
        { snapshot: {}, versionLabel: `${currentYear}.1` },
      );

      expect(response.status).toBe(409);
      expect(response.body.messages[0]?.code).toBe("VERSION_LABEL_TAKEN");
    });

    it("rejects a label that is not year.sequence", async () => {
      const dpp = await createDraftDpp(organization.admin);

      const response = await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: {},
        versionLabel: "final-v2",
      });

      expect(response.status).toBe(422);
    });
  });

  describe("versions and audit", () => {
    it("archives a version on every save and keeps the revision label", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("material", "one")] },
      });
      await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("material", "two")] },
      });

      const versions = await organization.admin.get<{
        versions: { versionLabel: string; versionNumber: number }[];
      }>(`/dpps/${dpp.publicId}/versions`);

      expect(versions.body.versions.length).toBeGreaterThanOrEqual(3);
      // Many saves, one revision: the label names the revision, the number orders
      // the snapshots.
      for (const version of versions.body.versions) {
        expect(version.versionLabel).toBe(`${currentYear}.1`);
      }
    });

    it("records every change in the audit trail", async () => {
      const dpp = await createDraftDpp(organization.admin);
      await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("material", "audited")] },
      });
      await publishDpp(organization.admin, dpp.publicId);

      const audit = await organization.admin.get<{ audit: { eventType: string }[] }>(
        `/dpps/${dpp.publicId}/audit-events`,
      );

      const events = audit.body.audit.map((entry) => entry.eventType);
      expect(events).toContain("dpp.created");
      expect(events).toContain("dpp.updated");
      expect(events).toContain("dpp.published");
    });
  });
});
