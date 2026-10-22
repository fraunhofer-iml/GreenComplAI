import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { controlledElement, createDraftDpp, publishDpp } from "./helpers/dpp.js";

// ESRS reporting feed: metrics from published passports, with evidence.
//
// The point of these tests isn't that a number comes out. It's that **none** comes out where
// it wouldn't be defensible - and that the reason takes its place instead. A plausible number
// without grounding would otherwise end up in an audited sustainability report.

const DPP_NS = "https://data.europa.eu/dpp/";

type Report = {
  report: {
    consideredDpps: number;
    metrics: {
      contributions: { publicId: string; value: number; versionLabel: string }[];
      coverage: { total: number; withValue: number };
      definition: { key: string; standard: string; unit: string };
      distribution: { max: number; median: number; min: number } | null;
      unparsable: { publicId: string; raw: unknown }[];
      weightedAverage: number | null;
      weightedAverageOmittedBecause: string | null;
    }[];
    scopeNote: string;
  };
};

const AS_OF = "2026-12-31T00:00:00Z";

describe("sustainability metrics for ESRS input", () => {
  let organization: OrganizationFixture;
  let viewer: TestClient;
  let repositoryKey: string;
  let binding: string;

  const metric = (report: Report, key: string) =>
    report.report.metrics.find((entry) => entry.definition.key === key)!;

  // A dictionary whose entries carry the semantic identifiers the catalog uses to recognize
  // data points. This is exactly what it looks like when a tenant adopts a standardized
  // dictionary.
  beforeAll(async () => {
    organization = await createOrganization("esrs");
    viewer = await addMember(organization, "viewer");

    repositoryKey = `esrs-${randomUUID().slice(0, 8)}`;
    binding = `${repositoryKey}/2026.1`;

    await organization.admin.post("/data-dictionary-repositories", {
      repositoryKey,
      name: { de: "Nachhaltigkeits-Wörterbuch" },
      namespaceUri: `https://dictionary.test/${repositoryKey}/2026.1/`,
      version: "2026.1",
      status: "active",
    });

    for (const entry of [
      { entryKey: "rezyklat", canonicalUri: `${DPP_NS}recycledContentShare`, unit: "%" },
      { entryKey: "co2", canonicalUri: `${DPP_NS}carbonFootprint`, unit: "kg CO2e" },
      { entryKey: "masse", canonicalUri: `${DPP_NS}weight`, unit: "kg" },
      // A substance declaration has no unit - that's the point of `presence`.
      { entryKey: "stoffe", canonicalUri: `${DPP_NS}substancesOfConcern`, unit: undefined },
    ]) {
      const created = await organization.admin.post(
        `/data-dictionary-repositories/${repositoryKey}/entries`,
        {
          ...entry,
          name: { de: entry.entryKey },
          valueType: "string",
          visibility: "public",
          required: false,
        },
      );
      expect(created.status).toBe(201);
    }
  });

  const element = (
    entryKey: string,
    value: string,
    visibility: "public" | "controlled" = "public",
  ) =>
    visibility === "public"
      ? {
          elementId: entryKey,
          dictionaryReference: entryKey,
          kind: "single" as const,
          value,
          valueDataType: "string",
          visibility: "public" as const,
        }
      : {
          ...controlledElement(entryKey, value, {
            readRoles: ["admin"],
            writeRoles: ["admin"],
          }),
          dictionaryReference: entryKey,
        };

  const publishWith = async (elements: unknown[]) => {
    const dpp = await createDraftDpp(organization.admin, { dataElements: elements });
    await organization.admin.patch(`/dpps/${dpp.publicId}`, {
      snapshot: { dppSchemaVersion: binding, dataElements: elements },
    });
    await publishDpp(organization.admin, dpp.publicId);
    return dpp.publicId;
  };

  describe("the weighted share, where it is defensible", () => {
    it("computes it when every contributing passport carries a mass", async () => {
      const org = organization;
      const first = await publishWith([element("rezyklat", "100 %"), element("masse", "3 kg")]);
      const second = await publishWith([element("rezyklat", "0 %"), element("masse", "1 kg")]);

      const response = await org.admin.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);
      expect(response.status).toBe(200);

      const share = metric(response.body, "e5-recycled-content-share");
      // 100% on 3 kg and 0% on 1 kg gives 75%, not 50%.
      expect(share.weightedAverage).toBe(75);
      expect(share.contributions.map((entry) => entry.publicId).sort()).toEqual(
        [first, second].sort(),
      );
    });
  });

  describe("the refusal, where it is not", () => {
    let organization2: OrganizationFixture;

    beforeAll(async () => {
      organization2 = await createOrganization("esrs-nomass");
      const key = `esrs-${randomUUID().slice(0, 8)}`;
      await organization2.admin.post("/data-dictionary-repositories", {
        repositoryKey: key,
        name: { de: "Ohne Masse" },
        namespaceUri: `https://dictionary.test/${key}/2026.1/`,
        version: "2026.1",
        status: "active",
      });
      await organization2.admin.post(`/data-dictionary-repositories/${key}/entries`, {
        entryKey: "rezyklat",
        canonicalUri: `${DPP_NS}recycledContentShare`,
        name: { de: "Rezyklat" },
        valueType: "string",
        visibility: "public",
        required: false,
      });

      const elements = [
        {
          elementId: "rezyklat",
          dictionaryReference: "rezyklat",
          kind: "single",
          value: "40 %",
          valueDataType: "string",
          visibility: "public",
        },
      ];
      const dpp = await createDraftDpp(organization2.admin, { dataElements: elements });
      await organization2.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${key}/2026.1`, dataElements: elements },
      });
      await publishDpp(organization2.admin, dpp.publicId);
    });

    // The core point: a screw and a vehicle must not count equally.
    it("withholds the average when a mass is missing, and names the reason", async () => {
      const response = await organization2.admin.get<Report>(
        `/sustainability/metrics?asOf=${AS_OF}`,
      );

      const share = metric(response.body, "e5-recycled-content-share");
      expect(share.weightedAverage).toBeNull();
      expect(share.weightedAverageOmittedBecause).toContain("Masse");
      // The distribution remains - it doesn't claim an aggregate statement.
      expect(share.distribution).toEqual({ max: 40, median: 40, min: 40 });
    });

    // A sum across per-product footprints would need unit counts.
    it("never turns per-product footprints into a total", async () => {
      await publishWith([element("co2", "12,5 kg CO2e")]);

      const response = await organization.admin.get<Report>(
        `/sustainability/metrics?asOf=${AS_OF}`,
      );

      const footprint = metric(response.body, "e1-product-carbon-footprint");
      expect(footprint.weightedAverage).toBeNull();
      expect(footprint.weightedAverageOmittedBecause).toContain("Stückzahlen");
    });
  });

  describe("what makes the figures readable", () => {
    it("reports coverage against all considered passports", async () => {
      const response = await organization.admin.get<Report>(
        `/sustainability/metrics?asOf=${AS_OF}`,
      );

      const share = metric(response.body, "e5-recycled-content-share");
      expect(share.coverage.total).toBe(response.body.report.consideredDpps);
      expect(share.coverage.withValue).toBeLessThanOrEqual(share.coverage.total);
    });

    it("carries the evidence: which passport, which version", async () => {
      const response = await organization.admin.get<Report>(
        `/sustainability/metrics?asOf=${AS_OF}`,
      );

      const share = metric(response.body, "e5-recycled-content-share");
      for (const contribution of share.contributions) {
        expect(contribution.publicId).toBeTruthy();
        expect(contribution.versionLabel).toMatch(/^\d{4}\.\d+$/);
      }
    });

    it("surfaces a value that is there but is not a number", async () => {
      const org = await createOrganization("esrs-unparsable");
      const key = `esrs-${randomUUID().slice(0, 8)}`;
      await org.admin.post("/data-dictionary-repositories", {
        repositoryKey: key,
        name: { de: "Mit Textwert" },
        namespaceUri: `https://dictionary.test/${key}/2026.1/`,
        version: "2026.1",
        status: "active",
      });
      await org.admin.post(`/data-dictionary-repositories/${key}/entries`, {
        entryKey: "rezyklat",
        canonicalUri: `${DPP_NS}recycledContentShare`,
        name: { de: "Rezyklat" },
        valueType: "string",
        visibility: "public",
        required: false,
      });

      const elements = [
        {
          elementId: "rezyklat",
          dictionaryReference: "rezyklat",
          kind: "single",
          value: "keine Angabe",
          valueDataType: "string",
          visibility: "public",
        },
      ];
      const dpp = await createDraftDpp(org.admin, { dataElements: elements });
      await org.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${key}/2026.1`, dataElements: elements },
      });
      await publishDpp(org.admin, dpp.publicId);

      const response = await org.admin.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);
      const share = metric(response.body, "e5-recycled-content-share");

      expect(share.unparsable).toHaveLength(1);
      expect(share.contributions).toHaveLength(0);
    });

    // A substance name is not a measurement error. It must be reported neither as an
    // unparsable value nor coerced into a number - what's counted is that it's present.
    it("counts a declaration instead of averaging it", async () => {
      const org = await createOrganization("esrs-presence");
      const key = `esrs-${randomUUID().slice(0, 8)}`;

      await org.admin.post("/data-dictionary-repositories", {
        repositoryKey: key,
        name: { de: "Stoffe" },
        namespaceUri: `https://dictionary.test/${key}/2026.1/`,
        version: "2026.1",
        status: "active",
      });
      await org.admin.post(`/data-dictionary-repositories/${key}/entries`, {
        entryKey: "stoffe",
        canonicalUri: `${DPP_NS}substancesOfConcern`,
        name: { de: "Besorgniserregende Stoffe" },
        valueType: "string",
        visibility: "public",
        required: false,
      });

      const elements = [
        {
          elementId: "stoffe",
          dictionaryReference: "stoffe",
          kind: "single" as const,
          value: "Blei (CAS 7439-92-1)",
          valueDataType: "string",
          visibility: "public" as const,
        },
      ];
      const dpp = await createDraftDpp(org.admin, { dataElements: elements });
      await org.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${key}/2026.1`, dataElements: elements },
      });
      await publishDpp(org.admin, dpp.publicId);

      const response = await org.admin.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);
      const substances = metric(response.body, "e2-substances-of-concern");

      expect(substances.coverage).toEqual({ total: 1, withValue: 1 });
      // The raw value is kept as evidence; the number beside it is `null`.
      expect(substances.contributions[0]?.raw).toBe("Blei (CAS 7439-92-1)");
      expect(substances.contributions[0]?.value).toBeNull();
      expect(substances.unparsable).toHaveLength(0);
      expect(substances.distribution).toBeNull();
      expect(substances.weightedAverageOmittedBecause).toContain("keine Zahl");
    });

    // The limitation is stated in the result, not in a footnote.
    it("says what it is not", async () => {
      const response = await organization.admin.get<Report>(
        `/sustainability/metrics?asOf=${AS_OF}`,
      );

      expect(response.body.report.scopeNote).toContain("keine berichtsfertigen");
      expect(response.body.report.scopeNote).toContain("Berichtspflichtige");
    });
  });

  describe("the same guards as every other read", () => {
    it("counts only published passports", async () => {
      const before = await organization.admin.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);
      await createDraftDpp(organization.admin, {
        dataElements: [element("rezyklat", "99 %")],
      });
      const after = await organization.admin.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);

      expect(after.body.report.consideredDpps).toBe(before.body.report.consideredDpps);
    });

    // An aggregate report is not a detour around the element policies.
    it("does not let a viewer read through to a controlled value", async () => {
      const org = await createOrganization("esrs-policy");
      const key = `esrs-${randomUUID().slice(0, 8)}`;
      await org.admin.post("/data-dictionary-repositories", {
        repositoryKey: key,
        name: { de: "Kontrolliert" },
        namespaceUri: `https://dictionary.test/${key}/2026.1/`,
        version: "2026.1",
        status: "active",
      });
      await org.admin.post(`/data-dictionary-repositories/${key}/entries`, {
        entryKey: "rezyklat",
        canonicalUri: `${DPP_NS}recycledContentShare`,
        name: { de: "Rezyklat" },
        valueType: "string",
        visibility: "controlled",
        required: false,
      });
      const orgViewer = await addMember(org, "viewer");

      const elements = [
        {
          ...controlledElement("rezyklat", "77 %", {
            readRoles: ["admin"],
            writeRoles: ["admin"],
          }),
          dictionaryReference: "rezyklat",
        },
      ];
      const dpp = await createDraftDpp(org.admin, { dataElements: elements });
      await org.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${key}/2026.1`, dataElements: elements },
      });
      await publishDpp(org.admin, dpp.publicId);

      const asAdmin = await org.admin.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);
      const asViewer = await orgViewer.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);

      expect(metric(asAdmin.body, "e5-recycled-content-share").coverage.withValue).toBe(1);
      // For the viewer, the value doesn't exist - and coverage says so instead of quietly
      // factoring it in.
      expect(metric(asViewer.body, "e5-recycled-content-share").coverage.withValue).toBe(0);
      expect(JSON.stringify(asViewer.body)).not.toContain("77 %");
    });

    it("hides another tenant's passports", async () => {
      const rival = await createOrganization("esrs-rival");

      const response = await rival.admin.get<Report>(`/sustainability/metrics?asOf=${AS_OF}`);

      expect(response.body.report.consideredDpps).toBe(0);
    });

    it("needs a timestamp with a timezone", async () => {
      const response = await organization.admin.get(
        "/sustainability/metrics?asOf=2026-12-31T00:00:00",
      );

      expect(response.status).toBe(422);
    });

    it("is not reachable anonymously", async () => {
      const response = await viewer.get(`/sustainability/metrics?asOf=${AS_OF}`);

      // A viewer may read - the policy filters the values, not the route.
      expect(response.status).toBe(200);
    });
  });
});
