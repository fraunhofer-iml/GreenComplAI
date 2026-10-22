import { describe, expect, it } from "vitest";

import { derivePublicIdFromBytes, generateDppPublicId, isDppPublicId } from "./public-id.js";

describe("generateDppPublicId", () => {
  it("produces a 12-character Base58 id", () => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const id = generateDppPublicId();
      expect(id).toHaveLength(12);
      expect(id).toMatch(/^[1-9A-HJ-NP-Za-km-z]{12}$/);
    }
  });

  it("never emits the visually ambiguous characters", () => {
    const sample = Array.from({ length: 200 }, () => generateDppPublicId()).join("");

    expect(sample).not.toMatch(/[0OIl]/);
  });

  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateDppPublicId()));

    expect(ids.size).toBe(1000);
  });

  it("honours a custom length", () => {
    expect(generateDppPublicId(20)).toHaveLength(20);
  });
});

describe("isDppPublicId", () => {
  it("accepts what the generator produces", () => {
    expect(isDppPublicId(generateDppPublicId())).toBe(true);
  });

  // The whole dual-lookup scheme rests on this: a URN must never be mistaken for
  // a public id, or the route would query the wrong column.
  it("rejects URNs", () => {
    expect(isDppPublicId("urn:dpp:demo-bicycle-001")).toBe(false);
    expect(isDppPublicId("urn:dpp:550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(isDppPublicId("abc")).toBe(false);
    expect(isDppPublicId(`${generateDppPublicId()}x`)).toBe(false);
    expect(isDppPublicId("")).toBe(false);
  });

  it("rejects characters outside the alphabet", () => {
    expect(isDppPublicId("DemoBike0Zqr")).toBe(false); // zero
    expect(isDppPublicId("DemoBikeOZqr")).toBe(false); // capital O
    expect(isDppPublicId("DemoBikeIZqr")).toBe(false); // capital I
    expect(isDppPublicId("DemoBikelZqr")).toBe(false); // lowercase L
    expect(isDppPublicId("DemoBike-Zqr")).toBe(false);
  });

  it("accepts the fixed demo ids", () => {
    for (const id of ["DemoBike2Zqr", "DemoPackAge4", "DemoBattery7"]) {
      expect(isDppPublicId(id)).toBe(true);
    }
  });
});

describe("derivePublicIdFromBytes", () => {
  it("is deterministic and valid", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    expect(derivePublicIdFromBytes(bytes)).toBe(derivePublicIdFromBytes(bytes));
    expect(isDppPublicId(derivePublicIdFromBytes(bytes))).toBe(true);
  });

  it("differs for different seeds", () => {
    const left = derivePublicIdFromBytes(new Uint8Array([1, 2, 3]));
    const right = derivePublicIdFromBytes(new Uint8Array([4, 5, 6]));

    expect(left).not.toBe(right);
  });
});
