import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { createOrganization, type OrganizationFixture } from "./helpers/client.js";

type Entry = { entryKey: string; name: { de?: string }; unit?: string | null };

// Addressing a dictionary entry by (organization, entryKey) was unambiguous only
// while that pair was unique. dropped that uniqueness so several versions of
// one dictionary can coexist — and with it, two things stopped being true:
//   - the same entryKey now exists once per version of its dictionary, and
//   - two *different* dictionaries in one organization may now share an entryKey,
//     which the old unique index had silently prevented.
// An entry therefore has to be addressed through its dictionary.
describe("dictionary entry addressing", () => {
  let organization: OrganizationFixture;
  let firstKey: string;
  let secondKey: string;

  const createDictionary = async (repositoryKey: string, label: string) => {
    const response = await organization.admin.post("/data-dictionary-repositories", {
      repositoryKey,
      name: { de: label },
      namespaceUri: `https://dictionary.test/${repositoryKey}/2026.1/`,
      version: "2026.1",
      status: "active",
    });
    expect(response.status).toBe(201);
  };

  beforeAll(async () => {
    organization = await createOrganization("dict-addr");
    firstKey = `first-${randomUUID().slice(0, 8)}`;
    secondKey = `second-${randomUUID().slice(0, 8)}`;
    await createDictionary(firstKey, "Erstes Wörterbuch");
    await createDictionary(secondKey, "Zweites Wörterbuch");
  });

  it("keeps two dictionaries' same-named entries apart", async () => {
    // Both dictionaries define "weight" — legitimate, and impossible to express
    // before G65.
    const first = await organization.admin.post(
      "/data-dictionary-repositories/" + firstKey + "/entries",
      {
        entryKey: "weight",
        name: { de: "Gewicht (erstes)" },
        valueType: "string",
        visibility: "public",
        required: false,
      },
    );
    const second = await organization.admin.post(
      "/data-dictionary-repositories/" + secondKey + "/entries",
      {
        entryKey: "weight",
        name: { de: "Gewicht (zweites)" },
        valueType: "string",
        visibility: "public",
        required: false,
      },
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstEntries = await organization.admin.get<{ entries: Entry[] }>(
      `/data-dictionary-repositories/${firstKey}/entries`,
    );
    const secondEntries = await organization.admin.get<{ entries: Entry[] }>(
      `/data-dictionary-repositories/${secondKey}/entries`,
    );

    expect(firstEntries.body.entries.find((e) => e.entryKey === "weight")?.name.de).toBe(
      "Gewicht (erstes)",
    );
    expect(secondEntries.body.entries.find((e) => e.entryKey === "weight")?.name.de).toBe(
      "Gewicht (zweites)",
    );
  });

  it("reads an entry through its dictionary, not organization-wide", async () => {
    const response = await organization.admin.get<{ entry: Entry }>(
      `/data-dictionary-repositories/${secondKey}/entries/weight`,
    );

    expect(response.status).toBe(200);
    expect(response.body.entry.name.de).toBe("Gewicht (zweites)");
  });

  // The core of the bug: editing must land in the dictionary that was named, not
  // in whichever row the database happened to return first.
  it("edits the named dictionary's entry, not another dictionary's", async () => {
    const response = await organization.admin.patch(
      `/data-dictionary-repositories/${secondKey}/entries/weight`,
      { unit: "kg" },
    );
    expect(response.status).toBe(200);

    const first = await organization.admin.get<{ entry: Entry }>(
      `/data-dictionary-repositories/${firstKey}/entries/weight`,
    );
    const second = await organization.admin.get<{ entry: Entry }>(
      `/data-dictionary-repositories/${secondKey}/entries/weight`,
    );

    expect(second.body.entry.unit).toBe("kg");
    expect(first.body.entry.unit).toBeNull();
  });

  it("404s for an entry that exists only in another dictionary", async () => {
    await organization.admin.post(`/data-dictionary-repositories/${firstKey}/entries`, {
      entryKey: "only-in-first",
      name: { de: "Nur im ersten" },
      valueType: "string",
      visibility: "public",
      required: false,
    });

    const response = await organization.admin.get(
      `/data-dictionary-repositories/${secondKey}/entries/only-in-first`,
    );

    expect(response.status).toBe(404);
  });

  it("404s for an unknown dictionary", async () => {
    const response = await organization.admin.get(
      "/data-dictionary-repositories/does-not-exist/entries/weight",
    );

    expect(response.status).toBe(404);
  });
});
