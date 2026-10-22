import type { ExternalProduct } from "@dpp/connector-sdk";
import { describe, expect, it } from "vitest";

import {
  applyMapping,
  buildMappingPlan,
  DOCUMENTS_FIELD,
  reconcileDecisions,
  suggestCandidate,
  type FieldDecision,
  type MappedField,
} from "./connector-mapping.js";

// The mapping as such - no database, no module, no HTTP.
//
// That is the point of the exercise: deciding "where does this field belong"
// is a question for the framework, not a provider. If this file had to
// mention SIMPL, something would have gone wrong.

function product(overrides: Partial<ExternalProduct> = {}): ExternalProduct {
  return {
    externalId: "X-1",
    name: "Ein Ding",
    sourceType: { key: "kind:1", label: "Eine Art" },
    identifiers: [],
    attributes: [
      { key: "pressure", label: "Betriebsdruck", value: 12.5, unit: "bar" },
      { key: "material", label: "Werkstoff", value: "Edelstahl" },
    ],
    documents: [],
    ...overrides,
  };
}

const decision = (overrides: Partial<FieldDecision> & { sourceField: string }): FieldDecision => ({
  target: "element",
  visibility: "controlled",
  ...overrides,
});

const mapped = (overrides: Partial<MappedField> & { sourceField: string }): MappedField => ({
  configured: true,
  label: overrides.sourceField,
  target: "element",
  value: "v",
  visibility: "controlled",
  ...overrides,
});

describe("building the plan", () => {
  it("defaults an undecided field to a source attribute, not to a passport element", () => {
    const plan = buildMappingPlan(product(), []);

    // `attribute`, not `element`: writing a field without a domain mapping
    // into the passport would create a data element with no meaning.
    expect(plan.fields.map((field) => field.target)).toEqual(["attribute", "attribute"]);
    expect(plan.fields.every((field) => !field.configured)).toBe(true);
  });

  it("marks fields that already carry a decision", () => {
    const plan = buildMappingPlan(product(), [
      decision({ sourceField: "pressure", dictionaryReference: "urn:pressure" }),
    ]);

    expect(plan.fields.find((field) => field.sourceField === "pressure")).toMatchObject({
      configured: true,
      dictionaryReference: "urn:pressure",
      target: "element",
    });
    // The new field stays recognizable as such - it is what someone needs to
    // review.
    expect(plan.fields.find((field) => field.sourceField === "material")?.configured).toBe(false);
  });

  it("keeps the source unit unless the decision names its own", () => {
    const plan = buildMappingPlan(product(), [decision({ sourceField: "pressure", unit: "kPa" })]);

    expect(plan.fields.find((field) => field.sourceField === "pressure")?.unit).toBe("kPa");
    // Without an explicit unit, the source system's unit applies.
    expect(buildMappingPlan(product(), []).fields[0]?.unit).toBe("bar");
  });

  it("shows only fields the record actually carries", () => {
    const plan = buildMappingPlan(product(), [decision({ sourceField: "gone-from-the-source" })]);

    expect(plan.fields.map((field) => field.sourceField)).toEqual(["pressure", "material"]);
  });

  it("falls back to a shared source type when the connector names none", () => {
    const plan = buildMappingPlan(product({ sourceType: undefined }), []);

    expect(plan.sourceType.key).toBe("");
  });
});

describe("suggesting a dictionary entry", () => {
  const entries = [
    {
      dictionaryReference: "urn:pressure",
      label: "Betriebsdruck",
      repositoryKey: "anlagen",
      unit: "bar",
      visibility: "controlled" as const,
      categoryId: "technical",
      categoryLabel: "Technische Daten",
    },
    {
      dictionaryReference: "urn:material",
      label: "Werkstoff",
      repositoryKey: "anlagen",
      visibility: "public" as const,
    },
    {
      dictionaryReference: "urn:mass",
      label: "Gewicht",
      repositoryKey: "anlagen",
      unit: "kg",
      visibility: "controlled" as const,
    },
  ];

  it("proposes the obvious match and carries its category and visibility", () => {
    const plan = buildMappingPlan(product(), [], entries);
    const pressure = plan.fields.find((field) => field.sourceField === "pressure");

    // The entry brings along where it belongs - that is the saving: one click
    // instead of three selections.
    expect(pressure?.suggestion).toMatchObject({
      dictionaryReference: "urn:pressure",
      categoryId: "technical",
      visibility: "controlled",
      confidence: 1,
    });
  });

  it("sees through spelling that differs only in case, hyphens and umlauts", () => {
    expect(suggestCandidate({ label: "betriebs-druck" }, entries)?.dictionaryReference).toBe(
      "urn:pressure",
    );
    expect(suggestCandidate({ label: "Werkstoff" }, entries)?.dictionaryReference).toBe(
      "urn:material",
    );
  });

  it("stays silent rather than proposing something unrelated", () => {
    expect(suggestCandidate({ label: "Wartungsintervall" }, entries)).toBeUndefined();
    expect(suggestCandidate({ label: "" }, entries)).toBeUndefined();
    expect(suggestCandidate({ label: "Betriebsdruck" }, [])).toBeUndefined();
  });

  it("lets a matching unit break a tie", () => {
    const ambiguous = [
      {
        dictionaryReference: "urn:a",
        label: "Masse",
        repositoryKey: "anlagen",
        unit: "g",
        visibility: "controlled" as const,
      },
      {
        dictionaryReference: "urn:b",
        label: "Masse",
        repositoryKey: "anlagen",
        unit: "kg",
        visibility: "controlled" as const,
      },
    ];

    expect(suggestCandidate({ label: "Masse", unit: "kg" }, ambiguous)?.dictionaryReference).toBe(
      "urn:b",
    );
  });

  it("says nothing about a field that already carries a decision", () => {
    const plan = buildMappingPlan(product(), [decision({ sourceField: "pressure" })], entries);

    // Where a decision has already been made, a suggestion would talk past it.
    expect(
      plan.fields.find((field) => field.sourceField === "pressure")?.suggestion,
    ).toBeUndefined();
    expect(plan.fields.find((field) => field.sourceField === "material")?.suggestion).toBeDefined();
  });
});

describe("documents", () => {
  const withDocuments = product({
    documents: [
      { externalId: "res-1", name: "Datenblatt.pdf", mimeType: "application/pdf" },
      { externalId: "res-2", name: "Konformitaet.pdf" },
    ],
  });

  it("appears as one field for the whole record, not one per file", () => {
    const plan = buildMappingPlan(withDocuments, []);
    const documents = plan.fields.find((field) => field.sourceField === DOCUMENTS_FIELD);

    // A decision per file would be worthless for the next record - it has
    // different files.
    expect(documents).toMatchObject({
      label: "Dokumente (2)",
      target: "attribute",
      value: ["Datenblatt.pdf", "Konformitaet.pdf"],
    });
  });

  it("stays out of the plan when the record carries none", () => {
    expect(buildMappingPlan(product(), []).fields.map((field) => field.sourceField)).not.toContain(
      DOCUMENTS_FIELD,
    );
  });

  it("gets no suggestion — a file name says nothing about a dictionary entry", () => {
    const plan = buildMappingPlan(
      withDocuments,
      [],
      [
        {
          dictionaryReference: "urn:doc",
          label: "Dokumente",
          repositoryKey: "anlagen",
          visibility: "controlled",
        },
      ],
    );

    expect(
      plan.fields.find((field) => field.sourceField === DOCUMENTS_FIELD)?.suggestion,
    ).toBeUndefined();
  });

  it("becomes a document element per stored file, under the shared decision", () => {
    const applied = applyMapping(
      [mapped({ sourceField: DOCUMENTS_FIELD, target: "element", value: ["a.pdf"] })],
      [
        {
          blobObjectId: "blob-1",
          collectionElementId: "docs",
          collectionName: "Dokumente",
          contentType: "application/pdf",
          dictionaryReference: "urn:doc",
          elementId: "document-res-1",
          filename: "Datenblatt.pdf",
          visibility: "public",
        },
      ],
    );

    expect(applied.collections[0]?.dataElements[0]).toEqual({
      elementId: "document-res-1",
      dictionaryReference: "urn:doc",
      name: { de: "Datenblatt.pdf", en: "Datenblatt.pdf" },
      visibility: "public",
      kind: "document",
      blobObjectId: "blob-1",
      filename: "Datenblatt.pdf",
      contentType: "application/pdf",
    });
    // The collective item itself never becomes a data element - it is the
    // decision, not the content.
    expect(applied.dataElements).toEqual([]);
    expect(applied.attributes).toEqual([]);
  });

  it("keeps the file names as a source note when they are not passport content", () => {
    const applied = applyMapping([
      mapped({ sourceField: DOCUMENTS_FIELD, target: "attribute", value: ["a.pdf", "b.pdf"] }),
    ]);

    expect(applied.attributes).toEqual([
      expect.objectContaining({ key: DOCUMENTS_FIELD, value: ["a.pdf", "b.pdf"] }),
    ]);
  });
});

describe("taking decisions from a request", () => {
  it("ignores decisions for fields this record does not have", () => {
    const plan = buildMappingPlan(product(), []);
    const fields = reconcileDecisions(plan, [
      decision({ sourceField: "pressure", dictionaryReference: "urn:pressure" }),
      // If this were honored, the mapping table could be filled with arbitrary
      // content through the import route.
      decision({ sourceField: "invented", dictionaryReference: "urn:whatever" }),
    ]);

    expect(fields.map((field) => field.sourceField).sort()).toEqual(["material", "pressure"]);
  });

  it("leaves untouched fields at their planned value", () => {
    const plan = buildMappingPlan(product(), []);
    const fields = reconcileDecisions(plan, [decision({ sourceField: "pressure" })]);

    expect(fields.find((field) => field.sourceField === "material")).toMatchObject({
      target: "attribute",
      configured: false,
    });
  });
});

describe("applying the decisions", () => {
  it("drops what was marked as not wanted", () => {
    const applied = applyMapping([
      mapped({ sourceField: "secret", target: "ignore" }),
      mapped({ sourceField: "keep", target: "attribute" }),
    ]);

    expect(applied.attributes.map((attribute) => attribute.key)).toEqual(["keep"]);
    expect(applied.dataElements).toEqual([]);
  });

  it("turns a mapped field into a passport element with its dictionary reference", () => {
    const applied = applyMapping([
      mapped({
        sourceField: "pressure",
        label: "Betriebsdruck",
        value: 12.5,
        dictionaryReference: "urn:pressure",
        visibility: "public",
      }),
    ]);

    expect(applied.dataElements).toEqual([
      {
        elementId: "pressure",
        dictionaryReference: "urn:pressure",
        name: { de: "Betriebsdruck", en: "Betriebsdruck" },
        visibility: "public",
        kind: "single",
        value: 12.5,
        valueDataType: "number",
      },
    ]);
    expect(applied.attributes).toEqual([]);
  });

  it("gathers elements of one collection under it and leaves the rest at the top", () => {
    const applied = applyMapping([
      mapped({
        sourceField: "a",
        dictionaryReference: "urn:a",
        collectionElementId: "technical",
        collectionName: "Technische Daten",
      }),
      mapped({
        sourceField: "b",
        dictionaryReference: "urn:b",
        collectionElementId: "technical",
        collectionName: "Technische Daten",
      }),
      mapped({ sourceField: "c", dictionaryReference: "urn:c" }),
    ]);

    expect(applied.collections).toHaveLength(1);
    expect(applied.collections[0]).toMatchObject({
      elementId: "technical",
      kind: "collection",
      name: { de: "Technische Daten" },
    });
    expect(applied.collections[0]?.dataElements.map((element) => element.elementId)).toEqual([
      "a",
      "b",
    ]);
    expect(applied.dataElements.map((element) => element.elementId)).toEqual(["c"]);
  });

  it("keeps a field as an attribute when its decision names no dictionary entry", () => {
    const applied = applyMapping([mapped({ sourceField: "orphan", target: "element" })]);

    // The decision is incomplete, not wrong: an element without a reference
    // would be a field in the passport that means nothing.
    expect(applied.dataElements).toEqual([]);
    expect(applied.attributes.map((attribute) => attribute.key)).toEqual(["orphan"]);
  });

  it("derives a usable element id from an ugly generated source key", () => {
    const applied = applyMapping([
      mapped({ sourceField: "cf/a 1:x", dictionaryReference: "urn:x" }),
    ]);

    expect(applied.dataElements[0]?.elementId).toBe("cf-a-1-x");
  });

  it("lets an explicit element id win over the derived one", () => {
    const applied = applyMapping([
      mapped({
        sourceField: "cf-a1",
        dictionaryReference: "urn:x",
        elementId: "operatingPressure",
      }),
    ]);

    expect(applied.dataElements[0]?.elementId).toBe("operatingPressure");
  });

  it("turns a list into a multi-value element rather than one joined string", () => {
    const applied = applyMapping([
      mapped({
        sourceField: "certificates",
        label: "Zertifikate",
        value: ["CE", "RoHS"],
        dictionaryReference: "urn:certs",
      }),
    ]);

    expect(applied.dataElements[0]).toMatchObject({
      elementId: "certificates",
      kind: "multi",
      valueList: [
        { elementId: "certificates.1", value: "CE", valueDataType: "string" },
        { elementId: "certificates.2", value: "RoHS", valueDataType: "string" },
      ],
    });
  });

  it("gives a null inside a list a type, because the schema demands one", () => {
    const applied = applyMapping([
      mapped({ sourceField: "mixed", value: [1, null], dictionaryReference: "urn:m" }),
    ]);

    const element = applied.dataElements[0];
    expect(element?.kind === "multi" && element.valueList.map((v) => v.valueDataType)).toEqual([
      "number",
      "string",
    ]);
  });

  it("records the value type so the dictionary check has something to compare", () => {
    const applied = applyMapping([
      mapped({ sourceField: "n", dictionaryReference: "urn:n", value: 1 }),
      mapped({ sourceField: "b", dictionaryReference: "urn:b", value: true }),
      mapped({ sourceField: "s", dictionaryReference: "urn:s", value: "x" }),
      mapped({ sourceField: "z", dictionaryReference: "urn:z", value: null }),
    ]);

    expect(
      applied.dataElements.map((element) => element.kind === "single" && element.valueDataType),
    ).toEqual(["number", "boolean", "string", undefined]);
  });
});
