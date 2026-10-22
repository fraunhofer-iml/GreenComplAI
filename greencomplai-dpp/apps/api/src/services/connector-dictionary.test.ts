import type { ExternalProduct } from "@dpp/connector-sdk";
import { describe, expect, it } from "vitest";

import { buildDictionaryDraft } from "./connector-dictionary.js";
import { buildMappingPlan, DOCUMENTS_FIELD, type MappingCandidate } from "./connector-mapping.js";

// Drafting a vocabulary from a record kind - no database, no module, no HTTP.
//
// The line under test is a narrow one: the draft may translate what the source
// system states, and it may say when it is guessing. It may not decide that a
// field belongs in a passport, and it may not write anything.

const options = {
  connectorKey: "simpl",
  namespaceBase: "https://api.example.test/dictionaries/o/org-1",
  version: "2026.1",
};

function product(overrides: Partial<ExternalProduct> = {}): ExternalProduct {
  return {
    externalId: "X-1",
    name: "Ein Ding",
    sourceType: { key: "asset:at-1", label: "Hochdruckaggregate" },
    identifiers: [],
    attributes: [
      { key: "pressure", label: "Betriebsdruck", value: 12.5, unit: "bar", valueType: "number" },
      { key: "material", label: "Werkstoff", value: "Edelstahl" },
    ],
    documents: [],
    ...overrides,
  };
}

function draftFor(
  overrides: Partial<ExternalProduct> = {},
  stored: Parameters<typeof buildMappingPlan>[1] = [],
  candidates: readonly MappingCandidate[] = [],
) {
  const external = product(overrides);

  return buildDictionaryDraft(external, buildMappingPlan(external, stored, candidates), options);
}

describe("the proposed dictionary", () => {
  it("derives key, namespace and name from the record kind", () => {
    expect(draftFor().repository).toEqual({
      name: "Hochdruckaggregate (SIMPL)",
      namespaceUri:
        "https://api.example.test/dictionaries/o/org-1/simpl-hochdruckaggregate/2026.1/",
      repositoryKey: "simpl-hochdruckaggregate",
      version: "2026.1",
    });
  });

  it("keeps the namespace per organization - a record kind's name is not unique", () => {
    // Two tenants importing the same SIMPL asset type would otherwise propose
    // the same URI, and the namespace is unique across the installation.
    const other = buildDictionaryDraft(product(), buildMappingPlan(product(), []), {
      ...options,
      namespaceBase: "https://api.example.test/dictionaries/o/org-2",
    });

    expect(other.repository.namespaceUri).not.toBe(draftFor().repository.namespaceUri);
  });
});

describe("what becomes an entry", () => {
  it("proposes one entry per undecided field", () => {
    expect(draftFor().entries.map((entry) => entry.sourceField)).toEqual(["pressure", "material"]);
  });

  it("leaves out a field that already points at a dictionary entry", () => {
    const draft = draftFor({}, [
      {
        sourceField: "pressure",
        target: "element",
        visibility: "controlled",
        dictionaryReference: "https://example.test/dict/pressure",
      },
    ]);

    expect(draft.entries.map((entry) => entry.sourceField)).toEqual(["material"]);
  });

  it("leaves out a field nobody wants imported", () => {
    const draft = draftFor({}, [
      { sourceField: "material", target: "ignore", visibility: "controlled" },
    ]);

    expect(draft.entries.map((entry) => entry.sourceField)).toEqual(["pressure"]);
  });

  it("reports a likely duplicate instead of dropping it", () => {
    // Filtering it out would decide for the user that the existing entry is the
    // right one; creating it silently would turn one vocabulary into two.
    const draft = draftFor(
      {},
      [],
      [
        {
          dictionaryReference: "https://example.test/dict/betriebsdruck",
          label: "Betriebsdruck",
          repositoryKey: "anlagen",
          unit: "bar",
          visibility: "controlled",
        },
      ],
    );

    // The dictionary it was found in travels with it. Whether that is a reason
    // to skip the entry depends on where the entries are headed, and the draft
    // does not know that yet - a boolean here would decide it too early.
    expect(draft.entries.find((entry) => entry.sourceField === "pressure")?.existing).toMatchObject(
      { label: "Betriebsdruck", repositoryKey: "anlagen" },
    );
    expect(
      draft.entries.find((entry) => entry.sourceField === "material")?.existing,
    ).toBeUndefined();
  });

  it("gives the documents field the type it has", () => {
    const draft = draftFor({
      documents: [{ externalId: "res-1", name: "Datenblatt.pdf" }],
    });

    expect(draft.entries.find((entry) => entry.sourceField === DOCUMENTS_FIELD)).toMatchObject({
      inferredValueType: false,
      valueType: "document",
    });
  });

  it("keeps this record's file count out of the documents entry", () => {
    // The field's label is "Dokumente (2)". An entry named after it is wrong
    // for the next asset, and two assets would key it differently.
    const draft = draftFor({
      documents: [
        { externalId: "res-1", name: "a.pdf" },
        { externalId: "res-2", name: "b.pdf" },
      ],
    });
    const documents = draft.entries.find((entry) => entry.sourceField === DOCUMENTS_FIELD);

    expect(documents).toMatchObject({ entryKey: "dokumente", name: "Dokumente" });
  });
});

describe("the value type of an entry", () => {
  it("takes what the source system states, and says it is not a guess", () => {
    expect(draftFor().entries[0]).toMatchObject({
      inferredValueType: false,
      valueType: "number",
    });
  });

  it("falls back to the value - and marks the fallback as a guess", () => {
    expect(draftFor().entries[1]).toMatchObject({
      inferredValueType: true,
      valueType: "string",
    });
  });

  it("reads a list as several values of one type, not as a type of its own", () => {
    const draft = draftFor({
      attributes: [{ key: "sizes", label: "Größen", value: [10, 20] }],
    });

    expect(draft.entries[0]).toMatchObject({ inferredValueType: true, valueType: "number" });
  });
});

describe("entry keys", () => {
  it("comes from the name someone will recognize the entry by", () => {
    expect(draftFor().entries.map((entry) => entry.entryKey)).toEqual([
      "betriebsdruck",
      "werkstoff",
    ]);
  });

  it("stays unique within the draft", () => {
    // The dictionary's key is unique per version; two fields named the same
    // would fail on the index after the first one had been created.
    const draft = draftFor({
      attributes: [
        { key: "a", label: "Druck", value: 1 },
        { key: "b", label: "Druck", value: 2 },
      ],
    });

    expect(draft.entries.map((entry) => entry.entryKey)).toEqual(["druck", "druck-2"]);
  });

  it("falls back to the source field where the name yields nothing", () => {
    const draft = draftFor({
      attributes: [{ key: "cf-a1", label: "—", value: 1 }],
    });

    expect(draft.entries[0]?.entryKey).toBe("cf-a1");
  });
});

describe("what the draft does not decide", () => {
  it("proposes nothing as public", () => {
    // What is disclosed is a disclosure decision. Defaulting it to `public`
    // would make that decision for someone by not asking them.
    const draft = draftFor();

    expect(draft.entries.every((entry) => entry.visibility === "controlled")).toBe(true);
  });
});
