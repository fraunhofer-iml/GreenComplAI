import { describe, expect, it } from "vitest";

import {
  median,
  parseNumericValue,
  summariseMetric,
  SUSTAINABILITY_METRICS,
  type MetricContribution,
  type SustainabilityMetricDefinition,
} from "./sustainability.js";

const share = SUSTAINABILITY_METRICS.find((metric) => metric.key === "e5-recycled-content-share")!;
const footprint = SUSTAINABILITY_METRICS.find(
  (metric) => metric.key === "e1-product-carbon-footprint",
)!;

const contribution = (publicId: string, value: number, mass?: number): MetricContribution => ({
  mass,
  publicId,
  raw: String(value),
  value,
  versionLabel: "2026.1",
});

describe("sustainability metrics", () => {
  describe("reading values", () => {
    it("takes a number as it is", () => {
      expect(parseNumericValue(42)).toBe(42);
      expect(parseNumericValue(0)).toBe(0);
    });

    it("reads a value carrying its unit", () => {
      expect(parseNumericValue("68 %")).toBe(68);
      expect(parseNumericValue("12 kg")).toBe(12);
      expect(parseNumericValue("3.5 kg CO2e")).toBe(3.5);
    });

    // The last separator decides - otherwise "1.234,5" would become 1.2345.
    it("tells German from English decimal notation", () => {
      expect(parseNumericValue("1.234,5")).toBe(1234.5);
      expect(parseNumericValue("1,234.5")).toBe(1234.5);
      expect(parseNumericValue("68,5")).toBe(68.5);
      expect(parseNumericValue("68.5")).toBe(68.5);
    });

    it("refuses what is not a number", () => {
      expect(parseNumericValue("keine Angabe")).toBeUndefined();
      expect(parseNumericValue("")).toBeUndefined();
      expect(parseNumericValue(null)).toBeUndefined();
      expect(parseNumericValue(undefined)).toBeUndefined();
      expect(parseNumericValue({ value: 5 })).toBeUndefined();
      expect(parseNumericValue(Number.NaN)).toBeUndefined();
    });

    it("keeps a negative value rather than dropping it", () => {
      // A negative footprint is questionable on the merits - but deciding
      // that is the reporter's job, not the parser's.
      expect(parseNumericValue("-2,5")).toBe(-2.5);
    });
  });

  describe("median", () => {
    it("takes the middle of an odd count", () => {
      expect(median([3, 1, 2])).toBe(2);
    });

    it("averages the two middles of an even count", () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
  });

  // The core rule: where an aggregation cannot be justified, it is not computed.
  describe("the weighted average is withheld unless it is defensible", () => {
    it("computes it when every contributing passport carries a mass", () => {
      const result = summariseMetric(share, {
        contributions: [contribution("a", 100, 3), contribution("b", 0, 1)],
        total: 2,
        unparsable: [],
      });

      // 100% on 3 kg and 0% on 1 kg give 75%, not 50%.
      expect(result.weightedAverage).toBe(75);
      expect(result.weightedAverageOmittedBecause).toBeNull();
    });

    // The point being made: a screw and a vehicle must not count equally. If
    // even one mass is missing, the weighting is skewed in an unknown way.
    it("withholds it when one mass is missing, and says so", () => {
      const result = summariseMetric(share, {
        contributions: [contribution("a", 100, 3), contribution("b", 0)],
        total: 2,
        unparsable: [],
      });

      expect(result.weightedAverage).toBeNull();
      expect(result.weightedAverageOmittedBecause).toContain("1 von 2");
      // The distribution stays - it makes no aggregate claim.
      expect(result.distribution).toEqual({ max: 100, median: 50, min: 0 });
    });

    it("treats a zero or negative mass as missing", () => {
      const result = summariseMetric(share, {
        contributions: [contribution("a", 10, 0), contribution("b", 20, 5)],
        total: 2,
        unparsable: [],
      });

      expect(result.weightedAverage).toBeNull();
    });

    // A sum over per-product footprints would need unit counts the platform
    // does not know. It is therefore never formed.
    it("never aggregates a per-product figure into a total", () => {
      const result = summariseMetric(footprint, {
        contributions: [contribution("a", 12), contribution("b", 30)],
        total: 2,
        unparsable: [],
      });

      expect(result.weightedAverage).toBeNull();
      expect(result.weightedAverageOmittedBecause).toContain("Stückzahlen");
      expect(result.distribution).toEqual({ max: 30, median: 21, min: 12 });
    });

    it("says plainly when no passport carries the datapoint", () => {
      const result = summariseMetric(share, { contributions: [], total: 120, unparsable: [] });

      expect(result.coverage).toEqual({ total: 120, withValue: 0 });
      expect(result.distribution).toBeNull();
      expect(result.weightedAverageOmittedBecause).toContain("Kein veröffentlichter Pass");
    });
  });

  // Without coverage, every metric is unreadable: 40% across three of two
  // hundred passports says nothing about the product range.
  describe("coverage and data quality are part of the answer", () => {
    it("reports how many of the considered passports carried a value", () => {
      const result = summariseMetric(share, {
        contributions: [contribution("a", 40, 1)],
        total: 200,
        unparsable: [],
      });

      expect(result.coverage).toEqual({ total: 200, withValue: 1 });
    });

    it("surfaces values that are there but are not numbers", () => {
      const result = summariseMetric(share, {
        contributions: [contribution("a", 40, 1)],
        total: 3,
        unparsable: [{ publicId: "b", raw: "keine Angabe" }],
      });

      expect(result.unparsable).toHaveLength(1);
      expect(result.unparsable[0]?.publicId).toBe("b");
    });
  });

  describe("non-numeric declarations", () => {
    const presence: SustainabilityMetricDefinition = {
      aggregation: "presence",
      canonicalUris: ["https://data.europa.eu/dpp/substancesOfConcern"],
      description: "",
      key: "test-presence",
      label: "",
      standard: "E2",
      unit: "Angabe",
    };

    // A median over substance names would be nonsense; the coverage is the
    // meaningful statement here.
    it("reports coverage and nothing else", () => {
      const result = summariseMetric(presence, {
        contributions: [
          { publicId: "a", raw: "Blei (CAS 7439-92-1)", value: null, versionLabel: "1.0.0" },
          { publicId: "b", raw: "keine", value: null, versionLabel: "1.0.0" },
        ],
        total: 5,
        unparsable: [],
      });

      expect(result.coverage).toEqual({ total: 5, withValue: 2 });
      expect(result.distribution).toBeNull();
      expect(result.weightedAverage).toBeNull();
      expect(result.weightedAverageOmittedBecause).toContain("keine Zahl");
    });
  });

  describe("the catalogue belongs to the platform", () => {
    // A tenant able to define what "recycled content share" means or how it
    // is calculated could tailor any metric to fit.
    it("names a unit, a standard and an aggregation rule for every metric", () => {
      for (const metric of SUSTAINABILITY_METRICS) {
        expect(metric.unit).toBeTruthy();
        expect(metric.standard).toMatch(/^E[1-5]$/);
        expect(metric.canonicalUris.length).toBeGreaterThan(0);
        expect(["distribution", "mass-weighted-share", "presence"]).toContain(metric.aggregation);
      }
    });

    it("keeps the keys unique", () => {
      const keys = SUSTAINABILITY_METRICS.map((metric) => metric.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});

// Type check: the catalogue is declared as a constant, not as input.
const _catalogue: readonly SustainabilityMetricDefinition[] = SUSTAINABILITY_METRICS;
void _catalogue;
