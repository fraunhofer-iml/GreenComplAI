import { describe, expect, it } from "vitest";

import { diffDppSnapshots, type DppSnapshot, type SinglevaluedDataElement } from "./index.js";

function element(overrides: Partial<SinglevaluedDataElement>): SinglevaluedDataElement {
  return {
    elementId: "el",
    kind: "single",
    visibility: "public",
    value: "v",
    ...overrides,
  };
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

describe("diffDppSnapshots", () => {
  it("detects a changed core field", () => {
    const diffs = diffDppSnapshots(snapshot({ productId: "old" }), snapshot({ productId: "new" }));
    expect(diffs).toContainEqual({
      path: "productId",
      label: "Produkt-ID",
      oldValue: "old",
      newValue: "new",
      kind: "changed",
    });
  });

  it("detects a changed data element value", () => {
    const prev = snapshot({ dataElements: [element({ elementId: "co2", value: "12" })] });
    const next = snapshot({ dataElements: [element({ elementId: "co2", value: "9" })] });
    expect(diffDppSnapshots(prev, next)).toEqual([
      { path: "co2", label: "co2", oldValue: "12", newValue: "9", kind: "changed" },
    ]);
  });

  it("detects added and removed elements", () => {
    const prev = snapshot({ dataElements: [element({ elementId: "a", value: "1" })] });
    const next = snapshot({ dataElements: [element({ elementId: "b", value: "2" })] });
    const diffs = diffDppSnapshots(prev, next);
    expect(diffs).toContainEqual({
      path: "a",
      label: "a",
      oldValue: "1",
      newValue: null,
      kind: "removed",
    });
    expect(diffs).toContainEqual({
      path: "b",
      label: "b",
      oldValue: null,
      newValue: "2",
      kind: "added",
    });
  });

  it("resolves collection members by absolute path with a combined label", () => {
    const withCollection = (value: string): DppSnapshot =>
      snapshot({
        collections: [
          {
            elementId: "materials",
            kind: "collection",
            visibility: "public",
            name: { de: "Materialien" },
            dataElements: [element({ elementId: "share", name: { de: "Anteil" }, value })],
          },
        ],
      });
    expect(diffDppSnapshots(withCollection("30"), withCollection("50"))).toEqual([
      {
        path: "materials/share",
        label: "Materialien · Anteil",
        oldValue: "30",
        newValue: "50",
        kind: "changed",
      },
    ]);
  });

  it("returns no diffs for identical snapshots", () => {
    const snap = snapshot({ dataElements: [element({ elementId: "x", value: "1" })] });
    expect(diffDppSnapshots(snap, snap)).toEqual([]);
  });
});
