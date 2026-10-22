import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp, publishDpp } from "./helpers/dpp.js";

// ESRS requirements as a checkbox on the dictionary.
//
// The value only shows up in the chain: check a box -> dictionary datapoints
// -> editor fields -> passport values -> metric in the report. The last test
// in this file drives that whole chain, because any single stage on its own
// proves nothing.

type Profiles = {
  esrs: {
    enabled: string[];
    profiles: {
      category: { id: string; name: string };
      datapoints: { canonicalUri: string; entryKey: string; required: boolean }[];
      key: string;
      maturity: string;
      standard: string;
    }[];
    repositoryVersion: string;
  };
};
type Application = {
  result: {
    conflicts: { canonicalUri: string; entryKey: string; existingCanonicalUri: string | null }[];
    created: string[];
    enabled: string[];
    existing: string[];
    forkedTo?: string;
  };
};
type Entries = { entries: { canonicalUri?: string | null; entryKey: string; required: boolean }[] };
type Repository = { repository: { metadata?: Record<string, unknown> | null; version: string } };
type Messages = { messages: { code?: string }[] };

const E5 = "esrs-e5-resource-use";
const E1 = "esrs-e1-climate";

describe("ESRS requirements as a checkbox on the dictionary", () => {
  let organization: OrganizationFixture;
  let viewer: TestClient;

  const newDictionary = async (fixture: OrganizationFixture = organization) => {
    const repositoryKey = `esrs-p-${randomUUID().slice(0, 8)}`;
    const created = await fixture.admin.post("/data-dictionary-repositories", {
      repositoryKey,
      name: { de: "Profilwörterbuch" },
      namespaceUri: `https://dictionary.test/${repositoryKey}/2026.1/`,
      version: "2026.1",
      status: "active",
    });
    expect(created.status).toBe(201);
    return repositoryKey;
  };

  beforeAll(async () => {
    organization = await createOrganization("esrs-profiles");
    viewer = await addMember(organization, "viewer");
  });

  describe("the catalogue", () => {
    it("offers the requirements and says none is on yet", async () => {
      const key = await newDictionary();

      const response = await organization.admin.get<Profiles>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
      );

      expect(response.status).toBe(200);
      expect(response.body.esrs.enabled).toEqual([]);
      expect(response.body.esrs.profiles.map((profile) => profile.key)).toEqual(
        expect.arrayContaining([E5, E1]),
      );
    });

    // Visible on the profile itself, not in a footnote: as long as the revised
    // ESRS are not in force and the new taxonomy is not published, every
    // profile is a working aid, not legal advice.
    it("marks every profile as provisional", async () => {
      const key = await newDictionary();

      const response = await organization.admin.get<Profiles>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
      );

      for (const profile of response.body.esrs.profiles) {
        expect(profile.maturity).toBe("provisional");
        expect(profile.standard).toMatch(/^E[1-5]$/);
      }
    });
  });

  describe("switching one on", () => {
    it("creates the datapoints and the category", async () => {
      const key = await newDictionary();

      const applied = await organization.admin.put<Application>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
        { profileKeys: [E5] },
      );

      expect(applied.status).toBe(200);
      expect(applied.body.result.created.length).toBeGreaterThan(0);

      const entries = await organization.admin.get<Entries>(
        `/data-dictionary-repositories/${key}/entries`,
      );
      const uris = entries.body.entries.map((entry) => entry.canonicalUri);
      expect(uris).toContain("https://data.europa.eu/dpp/recycledContentShare");
      // Mass is included because without it no weighted share can be formed
      // across the product range.
      expect(uris).toContain("https://data.europa.eu/dpp/weight");

      const repository = await organization.admin.get<Repository>(
        `/data-dictionary-repositories/${key}`,
      );
      const categories = repository.body.repository.metadata?.categories as { id: string }[];
      expect(categories.map((category) => category.id)).toContain("esrs-e5-circularity");
    });

    it("marks the mandatory datapoints as required", async () => {
      const key = await newDictionary();
      await organization.admin.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5],
      });

      const entries = await organization.admin.get<Entries>(
        `/data-dictionary-repositories/${key}/entries`,
      );
      const share = entries.body.entries.find(
        (entry) => entry.canonicalUri === "https://data.europa.eu/dpp/recycledContentShare",
      );
      expect(share?.required).toBe(true);
    });

    it("remembers which requirements are on", async () => {
      const key = await newDictionary();
      await organization.admin.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5, E1],
      });

      const response = await organization.admin.get<Profiles>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
      );
      expect(response.body.esrs.enabled.sort()).toEqual([E1, E5].sort());
    });
  });

  describe("switching it on twice", () => {
    // A user clicks twice, or enables E1 while E5 stays on. Neither may
    // create duplicates.
    it("creates nothing a second time", async () => {
      const key = await newDictionary();
      const first = await organization.admin.put<Application>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
        { profileKeys: [E5] },
      );
      const second = await organization.admin.put<Application>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
        { profileKeys: [E5] },
      );

      expect(first.body.result.created.length).toBeGreaterThan(0);
      expect(second.body.result.created).toEqual([]);
      expect(second.body.result.existing.length).toBe(first.body.result.created.length);
    });

    it("does not overwrite an entry the user has adjusted", async () => {
      const key = await newDictionary();
      await organization.admin.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5],
      });
      await organization.admin.patch(
        `/data-dictionary-repositories/${key}/entries/esrsRecycledContentShare`,
        { name: { de: "Rezyklatanteil (eigene Bezeichnung)" } },
      );

      await organization.admin.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5],
      });

      const entry = await organization.admin.get<{ entry: { name: { de: string } } }>(
        `/data-dictionary-repositories/${key}/entries/esrsRecycledContentShare`,
      );
      expect(entry.body.entry.name.de).toBe("Rezyklatanteil (eigene Bezeichnung)");
    });
  });

  // A case seen in production: a dictionary that already has a field with the
  // same key as a profile datapoint. Creation used to hit the unique index and
  // the whole selection failed with a 500 over a single name clash. Profile
  // keys now carry an `esrs` prefix; the remaining case - someone names their
  // own field exactly the same - is reported, not overwritten, and not
  // rejected with an error.
  describe("an entry of the same name already exists", () => {
    it("reports it instead of failing, and leaves it alone", async () => {
      const key = await newDictionary();
      await organization.admin.post(`/data-dictionary-repositories/${key}/entries`, {
        entryKey: "esrsWeight",
        canonicalUri: "https://example.test/verpackungsgewicht",
        name: { de: "Verpackungsgewicht" },
        valueType: "number",
        visibility: "public",
        required: false,
      });

      const response = await organization.admin.put<Application>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
        { profileKeys: [E5] },
      );

      expect(response.status).toBe(200);
      expect(response.body.result.conflicts).toEqual([
        {
          canonicalUri: "https://data.europa.eu/dpp/weight",
          entryKey: "esrsWeight",
          existingCanonicalUri: "https://example.test/verpackungsgewicht",
        },
      ]);
      // The remaining datapoints are created regardless - one name conflict
      // does not stall the whole selection.
      expect(response.body.result.created.length).toBeGreaterThan(0);

      const entry = await organization.admin.get<{
        entry: { canonicalUri: string; name: { de: string } };
      }>(`/data-dictionary-repositories/${key}/entries/esrsWeight`);
      expect(entry.body.entry.name.de).toBe("Verpackungsgewicht");
      expect(entry.body.entry.canonicalUri).toBe("https://example.test/verpackungsgewicht");
    });
  });

  // The decision that is easy to get wrong.
  describe("switching one off", () => {
    it("removes the claim but keeps the data", async () => {
      const key = await newDictionary();
      await organization.admin.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5],
      });

      const off = await organization.admin.put<Application>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
        { profileKeys: [] },
      );
      expect(off.status).toBe(200);
      expect(off.body.result.enabled).toEqual([]);

      // The entries stay: they may already carry values in passports, and
      // deleting them would destroy passport data just because someone
      // unchecked a box.
      const entries = await organization.admin.get<Entries>(
        `/data-dictionary-repositories/${key}/entries`,
      );
      expect(entries.body.entries.map((entry) => entry.canonicalUri)).toContain(
        "https://data.europa.eu/dpp/recycledContentShare",
      );
    });
  });

  describe("the rules that already applied still apply", () => {
    it("refuses an unknown requirement instead of silently ignoring it", async () => {
      const key = await newDictionary();

      const response = await organization.admin.put<Messages>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
        { profileKeys: ["gibt-es-nicht"] },
      );

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.code).toBe("ESRS_PROFILE_UNKNOWN");
    });

    it("does not let a viewer switch requirements on", async () => {
      const key = await newDictionary();

      const response = await viewer.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5],
      });

      expect(response.status).toBe(403);
    });

    it("404s an unknown dictionary", async () => {
      const response = await organization.admin.get(
        "/data-dictionary-repositories/gibt-es-nicht/esrs-profiles",
      );

      expect(response.status).toBe(404);
    });

    // G65: a version pinned by published passports is immutable. The checkbox
    // goes through the same path as any other change - the version is copied
    // rather than the pinned one modified.
    it("forks a version that published passports pin", async () => {
      const key = await newDictionary();

      // Publish first, then set the checkbox: after that the version is
      // pinned and must not change anymore.
      const dpp = await createDraftDpp(organization.admin, {});
      await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${key}/2026.1` },
      });
      await publishDpp(organization.admin, dpp.publicId);

      const applied = await organization.admin.put<Application>(
        `/data-dictionary-repositories/${key}/esrs-profiles`,
        { profileKeys: [E5] },
      );

      expect(applied.status).toBe(200);
      expect(applied.body.result.forkedTo).toBeTruthy();
      // And the consequence that matters: the published passport does not
      // retroactively acquire new required fields. It still pins 2026.1,
      // and that version stayed unchanged.
      const validation = await organization.admin.get<{ report: { valid: boolean } }>(
        `/dpps/${dpp.publicId}/validation`,
      );
      expect(validation.body.report.valid).toBe(true);
    });

    // The consequence to keep in mind: a checkbox creates *required* fields.
    // A draft that does not carry them can no longer be published after that
    // - that is the point of "required", but it is easy to be caught off
    // guard by it.
    it("blocks publishing a draft that does not carry the new mandatory fields", async () => {
      const key = await newDictionary();
      const dpp = await createDraftDpp(organization.admin, {});
      await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${key}/2026.1` },
      });

      await organization.admin.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5],
      });

      await organization.admin.put(`/dpps/${dpp.publicId}/status`, { status: "review" });
      const published = await organization.admin.put<Messages>(`/dpps/${dpp.publicId}/status`, {
        status: "published",
      });

      expect(published.status).toBe(422);
      expect(published.body.messages[0]?.code).toBe("DPP_PUBLISH_VALIDATION_FAILED");
    });

    it("hides another tenant's dictionary", async () => {
      const key = await newDictionary();
      const rival = await createOrganization("esrs-profiles-rival");

      const response = await rival.admin.get(`/data-dictionary-repositories/${key}/esrs-profiles`);

      expect(response.status).toBe(404);
    });
  });

  // The point of the whole exercise: the checkbox should end up as a metric.
  describe("end to end: checkbox to metric", () => {
    it("makes the sustainability report find the values", async () => {
      const org = await createOrganization("esrs-loop");
      const key = await newDictionary(org);

      // 1. Set the checkbox.
      await org.admin.put(`/data-dictionary-repositories/${key}/esrs-profiles`, {
        profileKeys: [E5],
      });

      // 2. Create a passport that pins the dictionary, and fill the created fields.
      const elements = [
        {
          elementId: "esrsRecycledContentShare",
          dictionaryReference: "esrsRecycledContentShare",
          kind: "single",
          value: 60,
          valueDataType: "number",
          visibility: "public",
        },
        {
          elementId: "esrsWeight",
          dictionaryReference: "esrsWeight",
          kind: "single",
          value: 2,
          valueDataType: "number",
          visibility: "public",
        },
      ];
      const dpp = await createDraftDpp(org.admin, { dataElements: elements });
      await org.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${key}/2026.1`, dataElements: elements },
      });
      await publishDpp(org.admin, dpp.publicId);

      // 3. The report recognizes them by the semantic identifier - without
      //    any mapping maintained by hand anywhere.
      const report = await org.admin.get<{
        report: {
          metrics: {
            contributions: unknown[];
            coverage: { withValue: number };
            definition: { key: string };
            weightedAverage: number | null;
          }[];
        };
      }>("/sustainability/metrics?asOf=2026-12-31T00:00:00Z");

      const share = report.body.report.metrics.find(
        (metric) => metric.definition.key === "e5-recycled-content-share",
      )!;
      expect(share.coverage.withValue).toBe(1);
      // Mass came from the same profile - so the weighted average can be
      // computed here and is not withheld.
      expect(share.weightedAverage).toBe(60);
    });
  });
});
