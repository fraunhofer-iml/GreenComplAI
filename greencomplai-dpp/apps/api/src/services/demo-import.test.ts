import { assetToProduct } from "@dpp/connector-simpl";
import {
  ASSET_TYPES,
  ASSETS,
  ORGANIZATIONS,
  DEMO_MACHINERY_ASSET_TYPE_ID,
  DEMO_MACHINERY_ORGANIZATION_ID,
} from "@dpp/connector-simpl/mock";
import { describe, expect, it } from "vitest";

import { demoDictionaryEntries, demoDpps, demoProducts } from "./demo.js";

// The seeded demo tenant claims its passport came from a SIMPL import. The mock
// serves the record it claims to have come from - and this is where the two are
// held against each other.
//
// Without it both sides stay plausible on their own while drifting apart: a
// renamed dictionary entry, a changed value, and the wizard suddenly proposes
// twenty new entries for a dictionary that already describes every one of
// them. That failure shows up as "the suggestions are bad", which is a hard
// thing to trace back to a fixture.

const asset = ASSETS.find((entry) => entry.externalId === "DEMO-UNIT-01")!;
const assetType = ASSET_TYPES.find((entry) => entry.id === DEMO_MACHINERY_ASSET_TYPE_ID);
const manufacturer = ORGANIZATIONS.find((entry) => entry.id === DEMO_MACHINERY_ORGANIZATION_ID);
const product = assetToProduct(asset, { assetType, manufacturer })!;
const seededProduct = demoProducts.find((entry) => entry.productId === "DEMO-UNIT-01")!;
const seededDpp = demoDpps["urn:dpp:demo-demo-machinery-unit01"]!;

describe("the SIMPL record behind the demo tenant", () => {
  it("imports onto the seeded product rather than beside it", () => {
    // The import anchors the product on the external id. A different one here
    // would silently create a second product for the same machine.
    expect(product.externalId).toBe(seededProduct.productId);
    expect(product.name).toBe(seededProduct.name.de);
    expect(product.category).toBe(seededProduct.category);
    expect(product.identifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "model", value: seededProduct.identifiers?.model }),
        expect.objectContaining({
          type: "serialNumber",
          value: seededProduct.identifiers?.serialNumber,
        }),
      ]),
    );
  });

  it("keeps the origin the seed records", () => {
    const source = seededProduct.metadata?.source as { externalId: string; sourceType: string };

    expect(source.externalId).toBe(product.externalId);
    expect(source.sourceType).toBe(product.sourceType?.key);
  });

  it("names the manufacturer the seed knows it under", () => {
    expect(product.manufacturer?.externalId).toBe(DEMO_MACHINERY_ORGANIZATION_ID);
    expect(product.manufacturer?.roles).toEqual(["manufacturer"]);
  });

  it("labels its fields the way the seeded dictionary names its entries", () => {
    // Exact label equality is what makes the mapping's suggestion land at
    // confidence 1. Anything less and the field arrives unassigned.
    const labels = new Set(product.attributes.map((attribute) => attribute.label));
    const unmatched = demoDictionaryEntries
      .filter((entry) => !labels.has(entry.name.de))
      .map((entry) => entry.entryKey);

    // The entries a custom field cannot cover, and why: the first six are the
    // asset's own columns, not custom fields; the status is SIMPL's own enum
    // under its own label; the two documents are files, and the mapping treats
    // a record's files as one field regardless of how many entries describe
    // them.
    expect(unmatched.sort()).toEqual(
      [
        "conformityDeclaration",
        "datasheet",
        "machineDescription",
        "manufacturerName",
        "operatingStatus",
        "productCategory",
        "productModel",
        "productName",
        "serialNumber",
      ].sort(),
    );
  });

  it("carries the values the seeded passport shows", () => {
    const byEntryKey = new Map(
      demoDictionaryEntries.map((entry) => [entry.name.de, entry.entryKey]),
    );
    const values = passportValues();

    // Two fields the passport does not show as the ERP holds them, and both
    // differences are decisions someone made on import rather than drift:
    // `switchingVoltagePerZone` is one free-text field split into two values,
    // `controlRange` is a tidied spelling.
    const reworked = new Set(["switchingVoltagePerZone", "controlRange"]);
    const compared: string[] = [];

    for (const attribute of product.attributes) {
      const entryKey = byEntryKey.get(attribute.label);
      if (!entryKey || reworked.has(entryKey) || !values.has(entryKey)) continue;

      compared.push(entryKey);
      expect(values.get(entryKey), `${entryKey} differs from the seeded passport`).toBe(
        attribute.value,
      );
    }

    // Guards the loop itself: a comparison that silently compares nothing
    // would pass just as happily.
    expect(compared.length).toBe(18);
  });

  it("serves both files the seeded passport carries", () => {
    const seeded = seededDpp.collections
      .flatMap((collection) => collection.dataElements)
      .filter((element) => element.kind === "document")
      .map((element) => element.filename);

    expect(product.documents.map((document) => document.name).sort()).toEqual(seeded.sort());
  });
});

// The passport's single values, keyed by the dictionary entry they follow.
function passportValues(): Map<string, unknown> {
  const namespace = "https://demo.dpp.local/dictionaries/demo-machinery/2026.1/";
  const elements = [
    ...seededDpp.dataElements,
    ...seededDpp.collections.flatMap((collection) => collection.dataElements),
  ];

  const values = new Map<string, unknown>();
  for (const element of elements) {
    if (element.kind !== "single" || !element.dictionaryReference) continue;
    values.set(element.dictionaryReference.replace(namespace, ""), element.value);
  }

  return values;
}
