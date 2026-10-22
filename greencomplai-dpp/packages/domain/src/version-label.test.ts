import { describe, expect, it } from "vitest";

import {
  compareVersionLabels,
  isValidVersionLabel,
  latestVersionLabel,
  nextVersionLabel,
  parseVersionLabel,
} from "./version-label.js";

const IN_2026 = new Date("2026-07-17T10:00:00Z");
const IN_2027 = new Date("2027-01-02T10:00:00Z");

describe("parseVersionLabel", () => {
  it("parses a well-formed label", () => {
    expect(parseVersionLabel("2026.1")).toEqual({ year: 2026, sequence: 1 });
    expect(parseVersionLabel("2027.42")).toEqual({ year: 2027, sequence: 42 });
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseVersionLabel("  2026.2 ")).toEqual({ year: 2026, sequence: 2 });
  });

  it("rejects malformed labels", () => {
    for (const label of ["", "2026", "2026.", ".1", "26.1", "2026.1.2", "abc", "2026-1"]) {
      expect(parseVersionLabel(label)).toBeNull();
    }
  });

  it("rejects a zero or padded sequence", () => {
    expect(parseVersionLabel("2026.0")).toBeNull();
    expect(parseVersionLabel("2026.01")).toBeNull();
  });

  it("does not confuse a dictionary binding for a label", () => {
    expect(parseVersionLabel("demo-bicycle-dpp/2026.1")).toBeNull();
  });
});

describe("isValidVersionLabel", () => {
  it("accepts what nextVersionLabel produces", () => {
    expect(isValidVersionLabel(nextVersionLabel([], IN_2026))).toBe(true);
  });

  it("rejects free text", () => {
    expect(isValidVersionLabel("final-v2")).toBe(false);
  });
});

describe("nextVersionLabel", () => {
  it("starts a fresh DPP at .1 of the current year", () => {
    expect(nextVersionLabel([], IN_2026)).toBe("2026.1");
  });

  it("increments within the same year", () => {
    expect(nextVersionLabel(["2026.1"], IN_2026)).toBe("2026.2");
    expect(nextVersionLabel(["2026.1", "2026.2"], IN_2026)).toBe("2026.3");
  });

  it("restarts at .1 in a new year", () => {
    expect(nextVersionLabel(["2026.1", "2026.2"], IN_2027)).toBe("2027.1");
  });

  it("continues the sequence of the current year, ignoring earlier years", () => {
    expect(nextVersionLabel(["2026.9", "2027.1"], IN_2027)).toBe("2027.2");
  });

  it("uses the highest sequence, not the count or the order", () => {
    expect(nextVersionLabel(["2026.3", "2026.1"], IN_2026)).toBe("2026.4");
  });

  it("ignores labels it cannot parse rather than throwing", () => {
    expect(nextVersionLabel(["final", "2026.1", ""], IN_2026)).toBe("2026.2");
  });

  it("survives a duplicate label", () => {
    expect(nextVersionLabel(["2026.1", "2026.1"], IN_2026)).toBe("2026.2");
  });
});

describe("compareVersionLabels / latestVersionLabel", () => {
  it("orders by sequence numerically, not as text", () => {
    // The whole point: "2026.10" < "2026.2" as strings, but is newer.
    expect(compareVersionLabels("2026.10", "2026.2")).toBeGreaterThan(0);
    expect(latestVersionLabel(["2026.2", "2026.10"])).toBe("2026.10");
  });

  it("orders across years", () => {
    expect(compareVersionLabels("2027.1", "2026.9")).toBeGreaterThan(0);
    expect(latestVersionLabel(["2027.1", "2026.9", "2026.10"])).toBe("2027.1");
  });

  it("treats equal labels as equal", () => {
    expect(compareVersionLabels("2026.3", "2026.3")).toBe(0);
  });

  it("sorts unparseable labels oldest so they never win", () => {
    expect(latestVersionLabel(["legacy", "2026.1"])).toBe("2026.1");
    expect(compareVersionLabels("legacy", "2026.1")).toBeLessThan(0);
  });

  it("returns undefined for an empty set", () => {
    expect(latestVersionLabel([])).toBeUndefined();
  });
});
