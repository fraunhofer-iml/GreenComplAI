// ESRS requirement profiles for dictionaries.
//
// The idea: a user checks a box on the dictionary for a requirement - "we
// want to report resource inflows for ESRS E5" - and gets the matching
// category filled in along with its required datapoints. The
// dictionary-driven editor turns that into fields on the passport, and the
// metrics evaluation recognizes them by their semantic identifier.
// That closes the loop: **what is selected here shows up as a number there.**
//
// **The catalogue belongs to the platform.** A tenant able to edit which
// datapoints belong to a requirement could satisfy the requirement by making
// it smaller - "satisfied" would then mean nothing. A tenant chooses
// *whether* a requirement applies, never *what* it consists of.
//
// **This is not the legal text.** The profiles capture which product data is
// needed for the named ESRS disclosures - they are a working aid, not legal
// advice. The revised ESRS were adopted on 2026-07-03 and apply to financial
// years starting 2027-01-01; the updated EFRAG XBRL taxonomy is promised for
// December 2026. Until then every profile is provisional, and it carries
// that as a field.

import type { DataValueType, VisibilityLevel } from "./index.js";

// The entry key deliberately carries an `esrs` prefix. It is unique per
// dictionary, and a tenant quite plausibly already has a field named
// `weight` - which could mean packaging weight. Without a prefix, selecting
// a profile would force a choice between aborting or overwriting an
// unrelated meaning. With the prefix that question never arises.
//
// A field that is already correctly tagged is still not duplicated:
// idempotency runs on `canonicalUri`, not on the key.
export type EsrsProfileDatapoint = {
  canonicalUri: string;
  description: string;
  entryKey: string;
  name: string;
  required: boolean;
  unit?: string;
  valueType: DataValueType;
  visibility: VisibilityLevel;
};

export type EsrsProfile = {
  category: { description: string; id: string; name: string };
  datapoints: EsrsProfileDatapoint[];
  description: string;
  key: string;
  label: string;
  // How the user recognizes how reliable the profile is. `provisional`
  // means: derived from domain expertise, not taken from an adopted data
  // catalogue.
  maturity: "provisional";
  standard: "E1" | "E2" | "E3" | "E4" | "E5";
};

const DPP_NS = "https://data.europa.eu/dpp/";

export const ESRS_PROFILES: EsrsProfile[] = [
  {
    category: {
      description: "Angaben zum Klimabeitrag des Produkts über seinen Lebensweg.",
      id: "esrs-e1-climate",
      name: "Klima (ESRS E1)",
    },
    datapoints: [
      {
        canonicalUri: `${DPP_NS}carbonFootprint`,
        description:
          "Produktbezogener CO₂-Fußabdruck in kg CO₂-Äquivalent. Eingangsgröße für Scope-3-Angaben nach ESRS E1.",
        entryKey: "esrsCarbonFootprint",
        name: "CO₂-Fußabdruck",
        required: true,
        unit: "kg CO2e",
        valueType: "number",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}carbonFootprintMethod`,
        description:
          "Berechnungsverfahren und Systemgrenze des Fußabdrucks. Ohne diese Angabe sind zwei Werte nicht vergleichbar.",
        entryKey: "esrsCarbonFootprintMethod",
        name: "Berechnungsverfahren",
        required: true,
        valueType: "string",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}energyConsumptionProduction`,
        description: "Energieverbrauch in der Herstellung, in kWh je Produkteinheit.",
        entryKey: "esrsEnergyConsumptionProduction",
        name: "Energieverbrauch Herstellung",
        required: false,
        unit: "kWh",
        valueType: "number",
        visibility: "controlled",
      },
    ],
    description:
      "Produktdaten für die Klimaangaben (ESRS E1). Das Berechnungsverfahren ist Pflicht, weil ein Fußabdruck ohne Systemgrenze keine vergleichbare Zahl ist.",
    key: "esrs-e1-climate",
    label: "E1 – Klimawandel",
    maturity: "provisional",
    standard: "E1",
  },
  {
    category: {
      description: "Angaben zu Stoffen im Produkt, die Menschen oder Umwelt belasten können.",
      id: "esrs-e2-pollution",
      name: "Umweltverschmutzung (ESRS E2)",
    },
    datapoints: [
      {
        canonicalUri: `${DPP_NS}substancesOfConcern`,
        description:
          "Im Produkt enthaltene besorgniserregende Stoffe, mit Stoffname und CAS-Nummer. Grundlage für die Angaben zu besonders besorgniserregenden Stoffen nach ESRS E2.",
        entryKey: "esrsSubstancesOfConcern",
        name: "Besorgniserregende Stoffe",
        required: true,
        valueType: "string",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}substanceConcentration`,
        description:
          "Konzentration der genannten Stoffe im Produkt oder im jeweiligen Bauteil, in Massenprozent.",
        entryKey: "esrsSubstanceConcentration",
        name: "Konzentration",
        required: false,
        unit: "%",
        valueType: "string",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}scipReference`,
        description:
          "Referenz des Eintrags in der SCIP-Datenbank der ECHA, sofern das Produkt dort gemeldet ist.",
        entryKey: "esrsScipReference",
        name: "SCIP-Referenz",
        required: false,
        valueType: "string",
        visibility: "public",
      },
    ],
    description:
      "Produktdaten für die Angaben zu besorgniserregenden Stoffen (ESRS E2). Pflicht ist allein die Stoffangabe selbst: eine Konzentration ohne benannten Stoff sagt nichts, ein benannter Stoff ohne Konzentration schon.",
    key: "esrs-e2-pollution",
    label: "E2 – Umweltverschmutzung",
    maturity: "provisional",
    standard: "E2",
  },
  {
    category: {
      description: "Angaben zum Wasserverbrauch über den Lebensweg des Produkts.",
      id: "esrs-e3-water",
      name: "Wasser (ESRS E3)",
    },
    datapoints: [
      {
        canonicalUri: `${DPP_NS}waterFootprint`,
        description:
          "Wasserverbrauch je Produkteinheit in Kubikmetern. Eingangsgröße für die Wasserangaben nach ESRS E3.",
        entryKey: "esrsWaterFootprint",
        name: "Wasserfußabdruck",
        required: true,
        unit: "m³",
        valueType: "number",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}waterFootprintMethod`,
        description:
          "Berechnungsverfahren und Systemgrenze des Wasserfußabdrucks. Ohne sie sind zwei Werte nicht vergleichbar — dieselbe Begründung wie beim CO₂-Fußabdruck.",
        entryKey: "esrsWaterFootprintMethod",
        name: "Berechnungsverfahren Wasser",
        required: true,
        valueType: "string",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}waterStressedSourcing`,
        description:
          "Ob das Produkt in einem Gebiet mit Wasserstress hergestellt wird. ESRS E3 verlangt den Verbrauch in solchen Gebieten gesondert; ohne diese Kennzeichnung lässt er sich nicht heraustrennen.",
        entryKey: "esrsWaterStressedSourcing",
        name: "Herstellung in Gebiet mit Wasserstress",
        required: false,
        valueType: "boolean",
        visibility: "controlled",
      },
    ],
    description:
      "Produktdaten für die Wasserangaben (ESRS E3). Das Verfahren ist Pflicht, weil ein Wasserfußabdruck ohne Systemgrenze keine vergleichbare Zahl ist.",
    key: "esrs-e3-water",
    label: "E3 – Wasser- und Meeresressourcen",
    maturity: "provisional",
    standard: "E3",
  },
  {
    category: {
      description:
        "Angaben zu Rohstoffen, deren Gewinnung Flächen und Arten betrifft — in der Praxis über die Entwaldungsverordnung.",
      id: "esrs-e4-biodiversity",
      name: "Biodiversität (ESRS E4)",
    },
    datapoints: [
      {
        canonicalUri: `${DPP_NS}containsEudrCommodities`,
        description:
          "Ob das Produkt Rohstoffe nach Anhang I der Verordnung (EU) 2023/1115 enthält — Rind, Kakao, Kaffee, Ölpalme, Kautschuk, Soja, Holz oder daraus hergestellte Erzeugnisse.",
        entryKey: "esrsContainsEudrCommodities",
        name: "Enthält EUDR-Rohstoffe",
        required: true,
        valueType: "boolean",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}eudrDueDiligenceStatement`,
        description:
          "Referenznummer der Sorgfaltserklärung im EU-Informationssystem. Nach der Änderung durch die Verordnung (EU) 2025/2650 gibt sie ab, wer die Ware erstmals in Verkehr bringt; nachgelagerte Akteure geben die Referenz weiter.",
        entryKey: "esrsEudrDueDiligenceStatement",
        name: "EUDR-Sorgfaltserklärung",
        required: false,
        valueType: "string",
        visibility: "controlled",
      },
      {
        canonicalUri: `${DPP_NS}rawMaterialOrigin`,
        description:
          "Herkunft der Rohstoffe: Erzeugerland und, soweit vorhanden, Geolokalisierung der Erzeugungsflächen.",
        entryKey: "esrsRawMaterialOrigin",
        name: "Rohstoffherkunft",
        required: false,
        valueType: "string",
        visibility: "controlled",
      },
    ],
    description:
      "Produktdaten für die Biodiversitätsangaben (ESRS E4). Der Produktbezug läuft hier über die Entwaldungsverordnung (EU) 2023/1115, die ab 30.12.2026 gilt (Kleinst- und Kleinunternehmen ab Juni 2027). Pflicht ist nur die Eingangsfrage: trägt das Produkt betroffene Rohstoffe? Alles Weitere ist erst dann verlangt.",
    key: "esrs-e4-biodiversity",
    label: "E4 – Biologische Vielfalt und Ökosysteme",
    maturity: "provisional",
    standard: "E4",
  },
  {
    category: {
      description:
        "Angaben zur Kreislauffähigkeit: Rezyklatanteil, Materialzusammensetzung und Verwertungswege.",
      id: "esrs-e5-circularity",
      name: "Kreislaufwirtschaft (ESRS E5)",
    },
    datapoints: [
      {
        canonicalUri: `${DPP_NS}recycledContentShare`,
        description:
          "Anteil rezyklierten Materials am Produkt, in Prozent. Eingangsgröße für die Ressourcenzuflüsse nach ESRS E5.",
        entryKey: "esrsRecycledContentShare",
        name: "Rezyklatanteil",
        required: true,
        unit: "%",
        valueType: "number",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}weight`,
        description:
          "Masse des Produkts. Wird als Gewichtungsgröße gebraucht — ohne sie lässt sich kein belastbarer Anteil über mehrere Produkte bilden.",
        entryKey: "esrsWeight",
        name: "Masse",
        required: true,
        unit: "kg",
        valueType: "number",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}recyclabilityRate`,
        description: "Anteil des Produkts, der stofflich verwertet werden kann, in Prozent.",
        entryKey: "esrsRecyclabilityRate",
        name: "Recyclingfähigkeit",
        required: false,
        unit: "%",
        valueType: "number",
        visibility: "public",
      },
      {
        canonicalUri: `${DPP_NS}materialComposition`,
        description: "Materialzusammensetzung des Produkts nach Werkstoffen und Anteilen.",
        entryKey: "esrsMaterialComposition",
        name: "Materialzusammensetzung",
        required: false,
        valueType: "string",
        visibility: "public",
      },
    ],
    description:
      "Produktdaten für die Angaben zu Ressourcenzuflüssen und Kreislauffähigkeit (ESRS E5). Die Masse gehört dazu, weil ohne sie kein gewichteter Anteil über das Sortiment gebildet werden kann.",
    key: "esrs-e5-resource-use",
    label: "E5 – Ressourcennutzung und Kreislaufwirtschaft",
    maturity: "provisional",
    standard: "E5",
  },
];

export function findEsrsProfile(key: string): EsrsProfile | undefined {
  return ESRS_PROFILES.find((profile) => profile.key === key);
}

// Which profiles are set on a dictionary lives in its metadata. Unknown keys
// are dropped on read: a profile that no longer exists must not fake a
// requirement.
export function readEnabledProfiles(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];

  const raw = (metadata as { esrsProfiles?: unknown }).esrsProfiles;
  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (key): key is string => typeof key === "string" && findEsrsProfile(key) !== undefined,
  );
}
