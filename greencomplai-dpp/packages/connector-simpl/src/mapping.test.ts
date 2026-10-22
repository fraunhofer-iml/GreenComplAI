import { describe, expect, it } from "vitest";

import { assetToProduct, resolveCustomFields } from "./mapping.js";

// What a custom field's JSON Schema says about the field, as opposed to what
// this one record's value happens to look like. The difference matters
// downstream: a dictionary entry drafted from a stated type is a translation,
// one drafted from a sampled value is a guess.
describe("reading an asset type's field schema", () => {
  const assetType = {
    id: "at-1",
    customFields: {
      properties: {
        pressure: { title: "Betriebsdruck", type: "number", unit: "bar" },
        commissioned: { title: "Inbetriebnahme", type: "string", format: "date" },
        seen: { title: "Zuletzt gesehen", type: "string", format: "date-time" },
        material: {
          title: "Werkstoff",
          type: "string",
          description: "Werkstoff des Druckbehälters",
          enum: ["Edelstahl", "Stahl"],
        },
        certified: { title: "Abgenommen", type: "boolean" },
        sizes: { title: "Größen", type: "array", items: { type: "number" } },
        untyped: { title: "Bemerkung" },
      },
    },
  };

  const values = {
    pressure: 12.5,
    commissioned: "2026-01-31",
    seen: "2026-07-01T10:00:00Z",
    material: "Edelstahl",
    certified: true,
    sizes: [10, 20],
    untyped: "frei",
  };

  const byKey = (key: string) =>
    resolveCustomFields(values, assetType).find((attribute) => attribute.key === key);

  it("carries the stated type over", () => {
    expect(byKey("pressure")?.valueType).toBe("number");
    expect(byKey("certified")?.valueType).toBe("boolean");
  });

  it("reads a date out of the format, where JSON Schema keeps it", () => {
    expect(byKey("commissioned")?.valueType).toBe("date");
    expect(byKey("seen")?.valueType).toBe("datetime");
  });

  it("takes a closed value list as the more specific statement", () => {
    expect(byKey("material")).toMatchObject({
      valueType: "enum",
      allowedValues: ["Edelstahl", "Stahl"],
    });
  });

  it("takes a list's type from its items - a list is several values, not a type", () => {
    expect(byKey("sizes")?.valueType).toBe("number");
  });

  it("leaves the type open where the schema names none", () => {
    // Deliberately not "string": inferring from the value would make the field's
    // type depend on which record happened to be looked up first.
    expect(byKey("untyped")?.valueType).toBeUndefined();
  });

  it("keeps the description only where the title already carries the name", () => {
    expect(byKey("material")?.description).toBe("Werkstoff des Druckbehälters");
    // Here the description *is* the label - repeating it would fill a field
    // without saying anything.
    expect(
      resolveCustomFields(
        { a: "x" },
        { customFields: { properties: { a: { description: "Nur Text" } } } },
      ).at(0),
    ).toMatchObject({ label: "Nur Text", description: undefined });
  });
});

describe("the asset's own fields", () => {
  it("states the condition as the closed list the spec fixes it to", () => {
    const product = assetToProduct({
      id: "a-1",
      title: "Aggregat",
      status: "RUNNING",
    });

    expect(product?.attributes).toContainEqual({
      key: "status",
      label: "Zustand (SIMPL)",
      value: "RUNNING",
      valueType: "enum",
      allowedValues: ["NEW", "RUNNING", "WARNING", "INACTIVE", "STOPPED"],
    });
  });
});
