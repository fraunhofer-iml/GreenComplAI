import { describe, expect, it } from "vitest";

import {
  type DictionaryEntryLike,
  type DppSnapshot,
  type SinglevaluedDataElement,
  validateSnapshotForPublish,
} from "./index.js";

function entry(
  overrides: Partial<DictionaryEntryLike> & { entryKey: string },
): DictionaryEntryLike {
  return { valueType: "string", required: false, ...overrides };
}

function element(overrides: Partial<SinglevaluedDataElement>): SinglevaluedDataElement {
  return { elementId: "el", kind: "single", visibility: "public", value: "v", ...overrides };
}

function snapshot(overrides: Partial<DppSnapshot> = {}): DppSnapshot {
  return {
    digitalProductPassportId: "urn:dpp:test",
    productId: "p-1",
    granularity: "item",
    dppSchemaVersion: "dict/1.0",
    status: "draft",
    lastUpdate: "2026-07-16T00:00:00.000Z",
    economicOperatorId: "op-1",
    collections: [],
    dataElements: [],
    ...overrides,
  };
}

describe("validateSnapshotForPublish", () => {
  it("passes a complete snapshot", () => {
    const entries = [entry({ entryKey: "co2", valueType: "number", required: true })];
    const snap = snapshot({
      dataElements: [element({ elementId: "co2", dictionaryReference: "co2", value: 12 })],
    });
    const report = validateSnapshotForPublish(snap, entries);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("flags a missing required datapoint", () => {
    const entries = [entry({ entryKey: "co2", required: true })];
    const report = validateSnapshotForPublish(snapshot(), entries);
    expect(report.valid).toBe(false);
    expect(report.errors.map((e) => e.code)).toContain("required-missing");
  });

  it("errors on empty core fields", () => {
    const report = validateSnapshotForPublish(snapshot({ productId: "" }), []);
    expect(report.errors.map((e) => e.code)).toContain("core-field-missing");
  });

  it("errors on a type mismatch against the dictionary", () => {
    const entries = [entry({ entryKey: "co2", valueType: "number" })];
    const snap = snapshot({
      dataElements: [
        element({ elementId: "co2", dictionaryReference: "co2", value: "not-a-number" }),
      ],
    });
    expect(validateSnapshotForPublish(snap, entries).errors.map((e) => e.code)).toContain(
      "type-mismatch",
    );
  });

  it("warns on a controlled element without an access policy", () => {
    const snap = snapshot({
      dataElements: [element({ elementId: "secret", visibility: "controlled", policy: undefined })],
    });

    expect(validateSnapshotForPublish(snap, []).warnings.map((w) => w.code)).toContain(
      "missing-policy",
    );
  });

  it("refuses a reference the bound dictionary does not hold", () => {
    // Nothing about such an element is checked - not its type, not its allowed
    // values. Publishing it would state as verified what was never looked at,
    // which is why this is an error and not a note in the report.
    const snap = snapshot({
      dataElements: [element({ elementId: "x", dictionaryReference: "unknown-key" })],
    });
    const report = validateSnapshotForPublish(snap, [entry({ entryKey: "co2" })]);

    expect(report.valid).toBe(false);
    expect(report.errors.map((e) => e.code)).toContain("unknown-reference");
  });

  it("names the broken binding once instead of every element under it", () => {
    // A binding pointing nowhere resolves to no entries, and every element would
    // report the same fact - burying the one issue that says why.
    const snap = snapshot({
      dataElements: [
        element({ elementId: "a", dictionaryReference: "co2" }),
        element({ elementId: "b", dictionaryReference: "water" }),
      ],
    });
    const report = validateSnapshotForPublish(snap, [], { bindingResolved: false });

    expect(report.valid).toBe(false);
    expect(report.errors.map((e) => e.code)).toEqual(["unresolved-binding"]);
    expect(report.errors[0]?.path).toBe("dppSchemaVersion");
  });

  it("says nothing about a binding that resolves to an empty dictionary", () => {
    // Empty is a legitimate answer, and different from "names nothing".
    const report = validateSnapshotForPublish(snapshot(), []);

    expect(report.errors).toHaveLength(0);
  });

  it("errors on duplicate element paths", () => {
    const snap = snapshot({
      dataElements: [
        element({ elementId: "dup", value: "a" }),
        element({ elementId: "dup", value: "b" }),
      ],
    });
    expect(validateSnapshotForPublish(snap, []).errors.map((e) => e.code)).toContain(
      "duplicate-path",
    );
  });
});
