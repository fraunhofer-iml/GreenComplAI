import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { createDraftDpp, publishDpp } from "./helpers/dpp.js";

// The price of the immutable binding : a passport points at **one**
// dictionary version. When a new one is created - say because an ESRS
// requirement was checked and the old version was bound by published
// passports - the passport stays where it is. This preview is the way back:
// it reports which versions exist and what an upgrade would do.

type Upgrade = {
  upgrade: {
    candidates: {
      diff: {
        added: { entryKey: string; required: boolean; valueType: string }[];
        removed: { entryKey: string; usedByPassport: boolean }[];
        requiredMissing: string[];
        typeChanged: { entryKey: string; from: string; to: string }[];
      };
      dppSchemaVersion: string;
      status: string;
      version: string;
    }[];
    current: { repositoryKey: string; version: string };
  };
};

type Messages = { messages: { code?: string }[] };

describe("upgrading a passport to a new dictionary version", () => {
  let organization: OrganizationFixture;
  let repositoryKey: string;

  const entryPayload = (entryKey: string, over: Record<string, unknown> = {}) => ({
    entryKey,
    canonicalUri: `https://dictionary.test/${repositoryKey}/${entryKey}`,
    name: { de: entryKey },
    valueType: "string",
    visibility: "public",
    required: false,
    ...over,
  });

  beforeAll(async () => {
    organization = await createOrganization("upgrade");
    repositoryKey = `upg-${randomUUID().slice(0, 8)}`;

    await organization.admin.post("/data-dictionary-repositories", {
      repositoryKey,
      name: { de: "Wörterbuch" },
      namespaceUri: `https://dictionary.test/${repositoryKey}/2026.1/`,
      version: "2026.1",
      status: "active",
    });
    await organization.admin.post(
      `/data-dictionary-repositories/${repositoryKey}/entries`,
      entryPayload("weight"),
    );
  });

  // A published passport binds the version. Every further change to the
  // dictionary therefore lands in a copy - exactly the situation that raises
  // the question.
  const publishedPassportOn = async (version: string) => {
    const elements = [
      {
        elementId: "weight",
        dictionaryReference: `https://dictionary.test/${repositoryKey}/weight`,
        kind: "single" as const,
        value: "12 kg",
        valueDataType: "string",
        visibility: "public" as const,
      },
    ];
    const dpp = await createDraftDpp(organization.admin, { dataElements: elements });
    await organization.admin.patch(`/dpps/${dpp.publicId}`, {
      snapshot: {
        dppSchemaVersion: `${repositoryKey}/${version}`,
        dataElements: elements,
      },
    });
    await publishDpp(organization.admin, dpp.publicId);
    return dpp.publicId;
  };

  it("reports no upgrade when no newer version exists", async () => {
    const publicId = await publishedPassportOn("2026.1");

    const response = await organization.admin.get<Upgrade>(`/dpps/${publicId}/dictionary-upgrade`);

    expect(response.status).toBe(200);
    expect(response.body.upgrade.current).toEqual({
      repositoryKey,
      version: "2026.1",
    });
    expect(response.body.upgrade.candidates).toEqual([]);
  });

  describe("after an ESRS requirement creates a new version", () => {
    let publicId: string;

    beforeAll(async () => {
      publicId = await publishedPassportOn("2026.1");

      // Checking the box on the dictionary. Because 2026.1 is bound by
      // published passports, this creates 2026.2 (G65).
      const applied = await organization.admin.put<{ result: { forkedTo?: string } }>(
        `/data-dictionary-repositories/${repositoryKey}/esrs-profiles`,
        { profileKeys: ["esrs-e5-resource-use"] },
      );
      expect(applied.body.result.forkedTo).toBeTruthy();
    });

    it("reports the new version and its changes", async () => {
      const response = await organization.admin.get<Upgrade>(
        `/dpps/${publicId}/dictionary-upgrade`,
      );

      const candidate = response.body.upgrade.candidates[0];
      expect(candidate?.version).toBe("2026.2");
      expect(candidate?.dppSchemaVersion).toBe(`${repositoryKey}/2026.2`);
      expect(candidate?.diff.added.map((entry) => entry.entryKey)).toContain(
        "esrsRecycledContentShare",
      );
      // Nothing was dropped and nothing changed type: a copy plus new
      // entries.
      expect(candidate?.diff.removed).toEqual([]);
      expect(candidate?.diff.typeChanged).toEqual([]);
    });

    // The point one wants to see before deciding.
    it("lists required fields that would block publication", async () => {
      const response = await organization.admin.get<Upgrade>(
        `/dpps/${publicId}/dictionary-upgrade`,
      );

      const missing = response.body.upgrade.candidates[0]?.diff.requiredMissing;
      expect(missing).toContain("esrsRecycledContentShare");
      // Weight is also required in the E5 profile; the passport carries it
      // under a different identifier, so it is missing too.
      expect(missing).toContain("esrsWeight");
    });

    // A published passport is not upgraded - it is immutable. The upgrade
    // belongs in a draft and takes effect with the next publish; the shipped
    // passport does not get required fields sprung on it.
    it("rejects an upgrade on a published passport", async () => {
      const refused = await organization.admin.patch(`/dpps/${publicId}`, {
        snapshot: { dppSchemaVersion: `${repositoryKey}/2026.2` },
      });

      expect(refused.status).toBe(409);
    });

    // And the actual point: in a draft, the upgrade runs through the regular
    // PATCH, and afterwards the passport hangs off the new version.
    it("upgrades a draft through the normal patch operation", async () => {
      const revision = await organization.admin.post(`/dpps/${publicId}/revisions`, {});
      expect([200, 201]).toContain(revision.status);

      const upgraded = await organization.admin.patch(`/dpps/${publicId}`, {
        snapshot: { dppSchemaVersion: `${repositoryKey}/2026.2` },
      });
      expect(upgraded.status).toBe(200);

      const after = await organization.admin.get<Upgrade>(`/dpps/${publicId}/dictionary-upgrade`);
      expect(after.body.upgrade.current.version).toBe("2026.2");
      expect(after.body.upgrade.candidates).toEqual([]);
    });

    // The consequence to know: as long as the new required fields are empty,
    // the passport cannot be republished. That is the meaning of "required" -
    // but surprising if nobody said so beforehand.
    it("blocks publication until the new required fields are filled", async () => {
      const published = await organization.admin.post<Messages>(`/dpps/${publicId}/status`, {
        status: "published",
      });
      expect(published.status).toBeGreaterThanOrEqual(400);
    });
  });

  it("returns 404 for an unknown passport", async () => {
    const response = await organization.admin.get("/dpps/urn:dpp:gibt-es-nicht/dictionary-upgrade");

    expect(response.status).toBe(404);
  });
});
