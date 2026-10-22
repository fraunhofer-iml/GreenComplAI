import { randomUUID } from "node:crypto";

import { dataDictionaryEntries, dataDictionaryRepositories } from "@dpp/db/schema";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../src/db.js";
import { anonymous, createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { createDraftDpp, publishDpp } from "./helpers/dpp.js";

type Repository = { id: string; repositoryKey: string; version: string };
type Entry = { entryKey: string; name: { de?: string }; unit?: string | null };

// a published DPP pins a dictionary version, and the viewer reads the
// entries live. Editing a pinned version would silently rewrite what an already
// published passport says — so a pinned version is copied, never mutated.
describe("dictionary versioning", () => {
  let organization: OrganizationFixture;
  let repositoryKey: string;

  const dictionaryEntry = (entryKey: string, label: string) => ({
    entryKey,
    canonicalUri: `https://dictionary.test/${randomUUID()}`,
    name: { de: label },
    valueType: "string",
    visibility: "public",
    required: false,
  });

  const listRepositories = async () => {
    const response = await organization.admin.get<{ repositories: Repository[] }>(
      "/data-dictionary-repositories",
    );
    return response.body.repositories.filter(
      (repository) => repository.repositoryKey === repositoryKey,
    );
  };

  beforeAll(async () => {
    organization = await createOrganization("dict");
    repositoryKey = `dict-${randomUUID().slice(0, 8)}`;

    await organization.admin.post("/data-dictionary-repositories", {
      repositoryKey,
      name: { de: "Testwörterbuch" },
      namespaceUri: `https://dictionary.test/${repositoryKey}/2026.1/`,
      version: "2026.1",
      status: "active",
    });
    await organization.admin.post(
      `/data-dictionary-repositories/${repositoryKey}/entries`,
      dictionaryEntry("weight", "Gewicht"),
    );
  });

  it("edits an unpinned version in place", async () => {
    const before = await listRepositories();
    expect(before).toHaveLength(1);

    const response = await organization.admin.patch(
      `/data-dictionary-repositories/${repositoryKey}/entries/weight`,
      { name: { de: "Masse" } },
    );
    expect(response.status).toBe(200);

    // Nothing published points at 2026.1 yet, so there is no reason to fork —
    // and forking on every keystroke would sprawl into 2026.2, 2026.3, …
    expect(await listRepositories()).toHaveLength(1);
  });

  it("forks to a new version once a published DPP pins the current one", async () => {
    const dpp = await createDraftDpp(organization.admin, {
      dataElements: [
        {
          elementId: "weight",
          // The entry created above, by its key. A reference the bound
          // dictionary does not hold now blocks publishing, and this test needs
          // the publish to work - pinning the version is what it is about.
          dictionaryReference: "weight",
          kind: "single",
          value: "12",
          valueDataType: "string",
          visibility: "public",
        },
      ],
    });
    // Pin this dictionary version by publishing against it.
    await organization.admin.patch(`/dpps/${dpp.publicId}`, {
      snapshot: { dppSchemaVersion: `${repositoryKey}/2026.1` },
    });
    await publishDpp(organization.admin, dpp.publicId);

    const response = await organization.admin.patch(
      `/data-dictionary-repositories/${repositoryKey}/entries/weight`,
      { unit: "kg" },
    );
    expect(response.status).toBe(200);

    const versions = (await listRepositories()).map((repository) => repository.version).sort();
    expect(versions).toEqual(["2026.1", "2026.2"]);
  });

  it("leaves the pinned version's entries untouched", async () => {
    const versions = await listRepositories();
    const pinned = versions.find((repository) => repository.version === "2026.1");
    const forked = versions.find((repository) => repository.version === "2026.2");
    expect(pinned).toBeDefined();
    expect(forked).toBeDefined();

    // Queried per version directly: the HTTP entry list resolves the newest
    // version, so it could never show whether the pinned one survived intact —
    // which is the entire claim under test.
    const pinnedEntries = await db
      .select()
      .from(dataDictionaryEntries)
      .where(eq(dataDictionaryEntries.repositoryId, pinned!.id));
    const forkedEntries = await db
      .select()
      .from(dataDictionaryEntries)
      .where(eq(dataDictionaryEntries.repositoryId, forked!.id));

    expect(pinnedEntries.find((entry) => entry.entryKey === "weight")?.unit).toBeNull();
    expect(forkedEntries.find((entry) => entry.entryKey === "weight")?.unit).toBe("kg");
  });

  it("carries the whole entry set into the fork", async () => {
    const versions = await listRepositories();
    const pinned = versions.find((repository) => repository.version === "2026.1");
    const forked = versions.find((repository) => repository.version === "2026.2");

    const pinnedKeys = (
      await db
        .select()
        .from(dataDictionaryEntries)
        .where(eq(dataDictionaryEntries.repositoryId, pinned!.id))
    ).map((entry) => entry.entryKey);
    const forkedKeys = (
      await db
        .select()
        .from(dataDictionaryEntries)
        .where(eq(dataDictionaryEntries.repositoryId, forked!.id))
    ).map((entry) => entry.entryKey);

    expect(forkedKeys.sort()).toEqual(pinnedKeys.sort());
  });

  it("moves the namespace uri to the new version", async () => {
    const forked = (await listRepositories()).find((repository) => repository.version === "2026.2");

    const [row] = await db
      .select()
      .from(dataDictionaryRepositories)
      .where(eq(dataDictionaryRepositories.id, forked!.id));

    // Publishing 2026.2 under a .../2026.1/ namespace would misidentify it.
    expect(row?.namespaceUri).toContain("/2026.2/");
    expect(row?.namespaceUri).not.toContain("/2026.1/");
  });

  it("keeps serving the published passport against its pinned version", async () => {
    const dpps = await organization.admin.get<{
      result: { dpps: { dppSchemaVersion: string; publicId: string; status: string }[] };
    }>("/dpps?status=published");

    const pinned = dpps.body.result.dpps.find(
      (dpp) => dpp.dppSchemaVersion === `${repositoryKey}/2026.1`,
    );
    expect(pinned).toBeDefined();

    const response = await anonymous.get(`/public/dpps/${pinned!.publicId}`);

    // The passport still resolves even though the dictionary has moved on.
    expect(response.status).toBe(200);
  });
});
