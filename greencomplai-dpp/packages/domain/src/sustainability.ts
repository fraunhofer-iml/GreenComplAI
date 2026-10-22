// Reporting feed for sustainability reporting (ESRS).
//
// **What this is and is not.** ESRS data points are statements of a
// *company*, not properties of a product. A DPP platform therefore cannot be
// "ESRS-compliant" - it can only **feed** reporting: product data from
// published passports, aggregated with evidence down to the individual
// passport. The reporting entity is responsible for the reported figure;
// consolidation scope, reporting period, allocation and double-counting rules
// turn a data point into that figure, and none of them are known here.
//
// That is the rule this module carries: **where an aggregation cannot be
// substantiated, it is not computed.** It comes back as `null`, together with
// the reason. A plausible number without a basis would be more harmful here
// than none at all - it ends up in an audited report.

export type EsrsStandard = "E1" | "E2" | "E3" | "E4" | "E5";

export type SustainabilityMetricDefinition = {
  // What may be aggregated and what may not - the reason is attached to the
  // result.
  //
  //   * `mass-weighted-share`   Share that can be weighted by mass.
  //   * `distribution`          Number per product; distribution yes, sum no.
  //   * `presence`              **not** a number but a statement. All that's
  //     meaningful here is how many passports carry it at all - for a
  //     substance of concern or a due diligence statement, coverage is the
  //     statement, not an average.
  aggregation: "distribution" | "mass-weighted-share" | "presence";
  // Semantic identifiers under which this data point appears in a dictionary.
  // Tenant-owned `entryKey`s do not work for this: they are named differently
  // in every organization.
  canonicalUris: string[];
  description: string;
  key: string;
  label: string;
  standard: EsrsStandard;
  unit: string;
};

// The catalog belongs to the platform, not the tenant. A tenant that could
// define what "recycled content share" means or how it is calculated could
// tailor any metric to fit - and it would no longer say anything.
const DPP_NS = "https://data.europa.eu/dpp/";

export const SUSTAINABILITY_METRICS: SustainabilityMetricDefinition[] = [
  {
    aggregation: "mass-weighted-share",
    canonicalUris: [
      `${DPP_NS}recycledContentShare`,
      `${DPP_NS}recycledAluminiumShare`,
      "https://esrs.efrag.org/E5/recycledContentShare",
    ],
    description:
      "Anteil rezyklierten Materials je Produkt. Fließt in ESRS E5 (Ressourcenzuflüsse) ein.",
    key: "e5-recycled-content-share",
    label: "Rezyklatanteil",
    standard: "E5",
    unit: "%",
  },
  {
    aggregation: "distribution",
    canonicalUris: [
      `${DPP_NS}carbonFootprint`,
      `${DPP_NS}productCarbonFootprint`,
      "https://esrs.efrag.org/E1/productCarbonFootprint",
    ],
    description: "Produktbezogener CO₂-Fußabdruck. Eingangsgröße für Scope-3-Angaben nach ESRS E1.",
    key: "e1-product-carbon-footprint",
    label: "CO₂-Fußabdruck je Produkt",
    standard: "E1",
    unit: "kg CO2e",
  },
  {
    aggregation: "distribution",
    canonicalUris: [`${DPP_NS}waterFootprint`],
    description: "Wasserfußabdruck je Produkteinheit. Eingangsgröße für ESRS E3 (Wasserverbrauch).",
    key: "e3-water-footprint",
    label: "Wasserfußabdruck je Produkt",
    standard: "E3",
    unit: "m³",
  },
  {
    aggregation: "presence",
    canonicalUris: [`${DPP_NS}substancesOfConcern`],
    description:
      "Deklaration besorgniserregender Stoffe. Für ESRS E2 zählt, wie viele Produkte eine Angabe tragen — ein Mittelwert über Stoffnamen ergibt keinen Sinn.",
    key: "e2-substances-of-concern",
    label: "Besorgniserregende Stoffe deklariert",
    standard: "E2",
    unit: "Angabe",
  },
  {
    aggregation: "presence",
    canonicalUris: [`${DPP_NS}eudrDueDiligenceStatement`],
    description:
      "Referenz der Sorgfaltserklärung nach der Entwaldungsverordnung (EU) 2023/1115. Eingangsgröße für ESRS E4 (Biodiversität).",
    key: "e4-deforestation-due-diligence",
    label: "EUDR-Sorgfaltserklärung hinterlegt",
    standard: "E4",
    unit: "Angabe",
  },
];

// Mass is read only as a **weighting quantity**, never reported. Without it
// there is no weighted average - see below.
export const MASS_CANONICAL_URIS = [`${DPP_NS}weight`, `${DPP_NS}mass`];

export type MetricContribution = {
  // The evidence: which passport, which version, which raw value.
  mass?: number | undefined;
  publicId: string;
  raw: unknown;
  // `null` for a statement that isn't a number (`presence`): the raw value
  // sits alongside it, since inventing a number from it would be made up.
  value: number | null;
  versionLabel: string;
};

export type MetricResult = {
  contributions: MetricContribution[];
  // Number of published passports that carry this data point at all, out of
  // all considered. Without this figure any metric is unreadable: 40% recycled
  // content across three of two hundred passports says nothing.
  coverage: { total: number; withValue: number };
  definition: SustainabilityMetricDefinition;
  distribution: { max: number; median: number; min: number } | null;
  // Only where substantiated. Otherwise `null` **with** a reason.
  weightedAverage: number | null;
  weightedAverageOmittedBecause: string | null;
  // Values that exist but are not numbers. They don't silently vanish - they
  // surface as a data quality finding.
  unparsable: { publicId: string; raw: unknown }[];
};

// Tolerant, but not blind: "68 %", "68,5", "1.234,5 kg" are read, nothing
// else. A value that doesn't parse into a number is counted and reported
// rather than skipped - it's a data quality finding, not nothing.
export function parseNumericValue(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== "string") return undefined;

  const cleaned = raw.trim().replace(/[\s ]/g, "");
  // The last separator decides: "1.234,5" is German, "1,234.5" is English.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const normalized =
    lastComma > lastDot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");

  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;

  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

export function summariseMetric(
  definition: SustainabilityMetricDefinition,
  input: {
    contributions: MetricContribution[];
    total: number;
    unparsable: { publicId: string; raw: unknown }[];
  },
): MetricResult {
  const values = input.contributions
    .map((contribution) => contribution.value)
    .filter((value): value is number => value !== null);

  return {
    contributions: input.contributions,
    coverage: { total: input.total, withValue: input.contributions.length },
    definition,
    distribution:
      definition.aggregation !== "presence" && values.length > 0
        ? { max: Math.max(...values), median: median(values), min: Math.min(...values) }
        : null,
    unparsable: input.unparsable,
    ...weightedAverageFor(definition, input.contributions),
  };
}

// This is where this module's real decision lives.
//
// A plain average over product shares is **wrong** - not imprecise, but
// meaningless: a screw and a vehicle would count equally in it. Only a
// mass-weighted share is defensible, and that only exists if **every**
// contributing passport has a mass. If even one is missing it, the weighting
// is skewed by an unknown amount.
//
// Hence: either weighted and complete, or not at all. The distribution
// (min/median/max) is kept in any case - it doesn't claim to be an aggregate.
function weightedAverageFor(
  definition: SustainabilityMetricDefinition,
  contributions: MetricContribution[],
): { weightedAverage: number | null; weightedAverageOmittedBecause: string | null } {
  if (definition.aggregation === "presence") {
    return {
      weightedAverage: null,
      weightedAverageOmittedBecause:
        "Diese Größe ist eine Angabe, keine Zahl. Aussagekräftig ist allein, wie viele Pässe sie tragen — siehe Abdeckung.",
    };
  }

  if (definition.aggregation !== "mass-weighted-share") {
    return {
      weightedAverage: null,
      weightedAverageOmittedBecause:
        "Für diese Größe ist keine Aggregation über Produkte definiert; ohne Stückzahlen wäre jede Summe oder jeder Mittelwert eine Erfindung.",
    };
  }

  if (contributions.length === 0) {
    return {
      weightedAverage: null,
      weightedAverageOmittedBecause: "Kein veröffentlichter Pass trägt diesen Datenpunkt.",
    };
  }

  const withoutMass = contributions.filter(
    (contribution) =>
      contribution.value === null || contribution.mass === undefined || contribution.mass <= 0,
  );
  if (withoutMass.length > 0) {
    return {
      weightedAverage: null,
      weightedAverageOmittedBecause: `Für ${withoutMass.length} von ${contributions.length} Pässen fehlt eine Masse als Gewichtung. Ein ungewichteter Mittelwert würde ein Kleinteil so schwer zählen wie ein ganzes Produkt.`,
    };
  }

  const totalMass = contributions.reduce((sum, contribution) => sum + (contribution.mass ?? 0), 0);
  const weighted = contributions.reduce(
    (sum, contribution) => sum + (contribution.value ?? 0) * (contribution.mass ?? 0),
    0,
  );

  return { weightedAverage: weighted / totalMass, weightedAverageOmittedBecause: null };
}
