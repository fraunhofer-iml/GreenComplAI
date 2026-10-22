import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { controlledElement, createDraftDpp, publicElement, publishDpp } from "./helpers/dpp.js";

// /bulk creation and export.
//
// The point is not that many passports can be created at once. It is that a
// nightly run from the ERP is **repeatable**: replaying the same file twice
// yields the same state, not twice as many passports. And that an import
// which partially fails says *which* rows - not just that something went
// wrong.

type Report = {
  report: {
    created: number;
    failed: number;
    rows: { code?: string; productId: string; publicId?: string; status: string }[];
    skipped: number;
    updated: number;
  };
};
type Export = {
  export: {
    dpps: { dpp: { dataElements: unknown[]; productId: string }; publicId: string }[];
    exportedAt: string;
    total: number;
  };
};
type Messages = { messages: { code?: string; path?: string }[] };

describe("bulk import and export", () => {
  let organization: OrganizationFixture;
  let viewer: TestClient;
  let operatorId: string;

  const entry = (productId: string, overrides: Record<string, unknown> = {}) => ({
    productId,
    granularity: "model",
    dppSchemaVersion: "test-dictionary/2026.1",
    economicOperatorId: operatorId,
    ...overrides,
  });

  beforeAll(async () => {
    organization = await createOrganization("import");
    viewer = await addMember(organization, "viewer");

    operatorId = `OP-IMP-${randomUUID().slice(0, 8)}`;
    await organization.admin.post("/economic-operators", {
      operatorId,
      legalName: "Import GmbH",
      roles: ["manufacturer"],
    });
  });

  describe("creating in bulk", () => {
    it("creates every row and reports each one", async () => {
      const ids = [1, 2, 3].map(() => `imp-${randomUUID().slice(0, 8)}`);

      const response = await organization.admin.post<Report>("/dpps/import", {
        dpps: ids.map((id) => entry(id)),
      });

      expect(response.status).toBe(200);
      expect(response.body.report.created).toBe(3);
      expect(response.body.report.rows).toHaveLength(3);
      // Every row carries its public id - otherwise the caller would have to
      // search for what it just created after the import.
      for (const row of response.body.report.rows) {
        expect(row.status).toBe("created");
        expect(row.publicId).toBeTruthy();
      }
    });

    it("refuses a batch larger than one request should carry", async () => {
      const response = await organization.admin.post<Messages>("/dpps/import", {
        dpps: Array.from({ length: 501 }, () => entry(`imp-${randomUUID().slice(0, 8)}`)),
      });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("dpps");
    });

    it("does not let a viewer import", async () => {
      const response = await viewer.post("/dpps/import", { dpps: [entry("imp-viewer")] });

      expect(response.status).toBe(403);
    });
  });

  // The actual reason for the business key: a nightly run regularly sends the
  // same data again.
  describe("idempotence", () => {
    it("updates instead of duplicating when the same file is imported twice", async () => {
      const productId = `imp-${randomUUID().slice(0, 8)}`;
      const payload = {
        dpps: [entry(productId, { dataElements: [publicElement("stand", "eins")] })],
      };

      const first = await organization.admin.post<Report>("/dpps/import", payload);
      const second = await organization.admin.post<Report>("/dpps/import", payload);

      expect(first.body.report.created).toBe(1);
      expect(second.body.report.created).toBe(0);
      expect(second.body.report.updated).toBe(1);
      expect(second.body.report.rows[0]?.publicId).toBe(first.body.report.rows[0]?.publicId);

      const listed = await organization.admin.get<{ result: { dpps: { productId: string }[] } }>(
        `/dpps?productId=${encodeURIComponent(productId)}`,
      );
      expect(listed.body.result.dpps).toHaveLength(1);
    });

    it("carries the changed values into the existing passport", async () => {
      const productId = `imp-${randomUUID().slice(0, 8)}`;
      await organization.admin.post("/dpps/import", {
        dpps: [entry(productId, { dataElements: [publicElement("stand", "eins")] })],
      });

      const second = await organization.admin.post<Report>("/dpps/import", {
        dpps: [entry(productId, { dataElements: [publicElement("stand", "zwei")] })],
      });

      const view = await organization.admin.get<{
        view: { dpp: { dataElements: { value: unknown }[] } };
      }>(`/dpps/${second.body.report.rows[0]?.publicId}/view`);
      expect(view.body.view.dpp.dataElements[0]?.value).toBe("zwei");
    });

    // The same product id twice in one file: the second row hits the
    // passport the first row just created. Computed concurrently, this would
    // run into a conflict instead of an update.
    it("handles the same product twice within one batch", async () => {
      const productId = `imp-${randomUUID().slice(0, 8)}`;

      const response = await organization.admin.post<Report>("/dpps/import", {
        dpps: [
          entry(productId, { dataElements: [publicElement("stand", "eins")] }),
          entry(productId, { dataElements: [publicElement("stand", "zwei")] }),
        ],
      });

      expect(response.body.report.created).toBe(1);
      expect(response.body.report.updated).toBe(1);
      expect(response.body.report.failed).toBe(0);
    });
  });

  describe("the report says which rows, not just how many", () => {
    it("keeps the good rows when one is bad", async () => {
      const good = `imp-${randomUUID().slice(0, 8)}`;

      const response = await organization.admin.post<Report>("/dpps/import", {
        dpps: [
          entry(good),
          // Does not exist - the reference check from G21 applies here too.
          entry(`imp-${randomUUID().slice(0, 8)}`, { economicOperatorId: "OP-GIBT-ES-NICHT" }),
        ],
      });

      expect(response.status).toBe(200);
      expect(response.body.report.created).toBe(1);
      expect(response.body.report.failed).toBe(1);

      const failed = response.body.report.rows.find((row) => row.status === "failed");
      expect(failed?.code).toBe("DPP_REFERENCE_NOT_FOUND");
    });

    // Withdrawing a publication is a decision, not a side effect of a nightly
    // run.
    it("skips a published passport instead of quietly overwriting it", async () => {
      const productId = `imp-${randomUUID().slice(0, 8)}`;
      const created = await organization.admin.post<Report>("/dpps/import", {
        dpps: [entry(productId, { dataElements: [publicElement("stand", "veröffentlicht")] })],
      });
      await publishDpp(organization.admin, created.body.report.rows[0]!.publicId!);

      const second = await organization.admin.post<Report>("/dpps/import", {
        dpps: [entry(productId, { dataElements: [publicElement("stand", "überschrieben")] })],
      });

      expect(second.body.report.skipped).toBe(1);
      expect(second.body.report.rows[0]?.code).toBe("DPP_NOT_EDITABLE");

      const view = await organization.admin.get<{
        view: { dpp: { dataElements: { value: unknown }[] } };
      }>(`/dpps/${created.body.report.rows[0]?.publicId}/view`);
      expect(view.body.view.dpp.dataElements[0]?.value).toBe("veröffentlicht");
    });
  });

  describe("export", () => {
    it("serves the passports in the norm shape with a timestamp", async () => {
      const response = await organization.admin.get<Export>("/dpps/export?limit=5");

      expect(response.status).toBe(200);
      expect(response.body.export.dpps.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(response.body.export.exportedAt))).toBe(false);
      // The snapshot in norm shape, plus the short id for the round trip.
      expect(response.body.export.dpps[0]?.dpp.productId).toBeTruthy();
      expect(response.body.export.dpps[0]?.publicId).toBeTruthy();
    });

    it("filters by status", async () => {
      const response = await organization.admin.get<Export>("/dpps/export?status=published");

      expect(response.status).toBe(200);
    });

    it("refuses a page larger than the cap", async () => {
      expect((await organization.admin.get("/dpps/export?limit=501")).status).toBe(422);
    });

    // An export is not a way around the policies: whoever could not see a
    // controlled element individually does not see it in the export either.
    it("is role-filtered like every other read", async () => {
      const productId = `imp-${randomUUID().slice(0, 8)}`;
      await createDraftDpp(organization.admin, {
        productId,
        dataElements: [
          publicElement("offen", "sichtbar"),
          controlledElement("geheim", "verborgen", {
            readRoles: ["admin"],
            writeRoles: ["admin"],
          }),
        ],
      });

      const asViewer = await viewer.get<Export>("/dpps/export?limit=500");
      const serialized = JSON.stringify(asViewer.body);

      expect(serialized).toContain("offen");
      expect(serialized).not.toContain("geheim");
      expect(serialized).not.toContain("verborgen");
    });

    it("hides another tenant's passports", async () => {
      const rival = await createOrganization("import-rival");
      const rivalDpp = await createDraftDpp(rival.admin, {});

      const response = await organization.admin.get<Export>("/dpps/export?limit=500");

      expect(response.body.export.dpps.map((entry) => entry.publicId)).not.toContain(
        rivalDpp.publicId,
      );
    });
  });
});
