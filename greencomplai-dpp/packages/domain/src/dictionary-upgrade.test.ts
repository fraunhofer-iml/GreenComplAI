import { describe, expect, it } from "vitest";

import {
  diffDictionaryVersions,
  isEmptyUpgrade,
  type UpgradeEntryLike,
} from "./dictionary-upgrade.js";

const entry = (entryKey: string, over: Partial<UpgradeEntryLike> = {}): UpgradeEntryLike => ({
  canonicalUri: `urn:test:${entryKey}`,
  entryKey,
  required: false,
  valueType: "string",
  ...over,
});

describe("upgrading to a new dictionary version", () => {
  it("lists new datapoints and whether they are required", () => {
    const diff = diffDictionaryVersions(
      [entry("weight")],
      [entry("weight"), entry("esrsRecycledContentShare", { required: true })],
      ["urn:test:weight"],
    );

    expect(diff.added).toEqual([
      {
        entryKey: "esrsRecycledContentShare",
        required: true,
        valueType: "string",
      },
    ]);
  });

  // The point one wants to know before upgrading: afterwards the passport
  // cannot be published again until these fields are filled.
  it("lists required fields missing after the upgrade", () => {
    const diff = diffDictionaryVersions(
      [entry("weight")],
      [entry("weight", { required: true }), entry("esrsRecycledContentShare", { required: true })],
      ["urn:test:weight"],
    );

    // The passport carries `weight`, but not the new field.
    expect(diff.requiredMissing).toEqual(["esrsRecycledContentShare"]);
  });

  it("recognizes an existing value through its entry key", () => {
    const diff = diffDictionaryVersions(
      [entry("weight", { required: true })],
      [entry("weight", { required: true })],
      ["weight"],
    );

    expect(diff.requiredMissing).toEqual([]);
  });

  // Deleting values because an entry disappears would be data loss. So it
  // reports which values are affected - nothing gets removed.
  it("marks removed entries and whether the passport uses them", () => {
    const diff = diffDictionaryVersions(
      [entry("altfeld"), entry("ungenutzt")],
      [],
      ["urn:test:altfeld"],
    );

    expect(diff.removed).toEqual([
      { entryKey: "altfeld", usedByPassport: true },
      { entryKey: "ungenutzt", usedByPassport: false },
    ]);
  });

  it("reports a changed value type", () => {
    const diff = diffDictionaryVersions(
      [entry("weight", { valueType: "string" })],
      [entry("weight", { valueType: "number" })],
      [],
    );

    expect(diff.typeChanged).toEqual([{ entryKey: "weight", from: "string", to: "number" }]);
  });

  // Offering a version that differs in nothing as an "upgrade" would just be
  // noise.
  it("recognizes an upgrade with no changes", () => {
    const diff = diffDictionaryVersions([entry("weight")], [entry("weight")], ["urn:test:weight"]);

    expect(isEmptyUpgrade(diff)).toBe(true);
  });
});
