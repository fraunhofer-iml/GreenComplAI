import { createHash } from "node:crypto";

import { derivePublicIdFromBytes, isDppPublicId } from "@dpp/domain";
import type { DppSnapshot } from "@dpp/domain";

// Synthetic demo tenant for an example heat-treatment unit and its recorder.
// Company names, models, source identifiers and technical values are fictional.
// Free-text values deliberately include units, as connector imports may do.

const namespaceUri = "https://demo.dpp.local/dictionaries/demo-machinery/2026.1/";

type DemoRelationship = {
  id: string;
  metadata: Record<string, unknown> | null;
  relationshipType:
    | "contains"
    | "isComponentOf"
    | "replaces"
    | "isVariantOf"
    | "derivedFrom"
    | "hasPackaging"
    | "hasSparePart";
  sourceDppId: string;
  targetDigitalProductPassportId: string;
  targetDppId: string | null;
  targetProductId: string | null;
  validFrom: string;
  validTo: string | null;
  visibility: "public" | "controlled";
};

export const demoOrganization = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Demo Maschinenbau GmbH",
  slug: "demo-machinery-demo",
};

export const demoProducts = [
  {
    productId: "DEMO-UNIT-01",
    name: {
      de: "Testanlage GreenComplAI",
      en: "Test unit GreenComplAI",
    },
    category: "Standardmaschine",
    manufacturerProductId: "DEMO UNIT 01",
    lifecycleStatus: "active",
    identifiers: {
      model: "DEMO UNIT 01",
      serialNumber: "DEMO-SN-0001",
    },
    metadata: {
      demo: true,
      // As an import would leave it: provenance on the product.
      // The identifiers the SIMPL mock serves this unit under. `externalId` is
      // what an import anchors the product on, so it is the product identifier
      // - not SIMPL's internal record id, which nothing here would resolve.
      source: {
        connector: "simpl",
        externalId: "DEMO-UNIT-01",
        sourceType: "asset:11111111-1111-4111-8111-111111111111",
      },
    },
  },
  {
    productId: "DEMO-REC-01",
    name: {
      de: "Papierschreiber DEMO REC 01",
      en: "Chart recorder DEMO REC 01",
    },
    category: "Komponente",
    manufacturerProductId: "DEMO REC 01",
    lifecycleStatus: "active",
    identifiers: {
      model: "DEMO REC 01",
    },
    metadata: {
      demo: true,
    },
  },
] as Array<{
  category?: string;
  identifiers?: Record<string, string>;
  lifecycleStatus: string;
  manufacturerProductId?: string;
  metadata?: Record<string, unknown>;
  name: Record<string, string>;
  productId: string;
}>;

export const demoEconomicOperators = [
  {
    operatorId: "EO-DEMO_MACHINERY",
    legalName: "Demo Maschinenbau GmbH",
    roles: ["manufacturer"],
    countryCode: "DE",
    vatId: "DE000000000",
    address: {
      city: "Musterstadt",
      country: "DE",
    },
    metadata: {
      demo: true,
      // The identifier SIMPL keeps the same operator under - lets an import
      // recognize it again instead of creating a second one.
      simplOrganizationId: "22222222-2222-4222-8222-222222222222",
    },
  },
] as Array<{
  address?: Record<string, unknown>;
  countryCode?: string;
  legalName: string;
  metadata?: Record<string, unknown>;
  operatorId: string;
  roles: Array<
    | "manufacturer"
    | "importer"
    | "distributor"
    | "authorizedRepresentative"
    | "serviceProvider"
    | "recycler"
    | "authority"
  >;
  vatId?: string;
}>;

// The demo tenant lives in memory and has no database row to generate a public
// id on. The showcased passports get readable, fixed ids (they appear in the
// landing-page link and in screenshots); anything fabricated on the fly falls
// back to a derived one. Values must be valid public ids — 12 characters of
// Base58, so no 0/O/I/l.
const demoPublicIds: Record<string, string> = {
  // Public IDs use Base58, excluding 0/O/I/l. Tests check every example.
  "urn:dpp:demo-demo-machinery-unit01": "DemoUnitAB23",
  "urn:dpp:demo-demo-machinery-rec01": "DemoRecAB234",
};

export function demoPublicId(digitalProductPassportId: string): string {
  return (
    demoPublicIds[digitalProductPassportId] ??
    derivePublicIdFromBytes(createHash("sha256").update(digitalProductPassportId).digest())
  );
}

// Routes address demo DPPs by public id too, so map one back to its URN before
// looking it up.
function resolveDemoDppId(dppId: string): string {
  if (!isDppPublicId(dppId)) return dppId;
  return Object.keys(demoDpps).find((urn) => demoPublicId(urn) === dppId) ?? dppId;
}

export function getDemoDppPayload(dppId = demoDpp.digitalProductPassportId) {
  const resolvedId = resolveDemoDppId(dppId);
  const dpp = demoDpps[resolvedId] ?? createExternalDemoDpp(resolvedId);

  return {
    dpp,
    dictionaryRepositories: [demoDictionaryRepository],
    dictionaryEntries: demoDictionaryEntries,
    relationships: demoRelationshipsByDppId[dpp.digitalProductPassportId] ?? [],
  };
}

export const demoDictionaryRepository = {
  id: "demo-repository-demo-machinery-2026-1",
  organizationId: "demo-org",
  repositoryKey: "demo-machinery-anlagen-dpp",
  name: {
    de: "Datenwörterbuch für Glühanlagen (Demo Maschinenbau)",
    en: "Data dictionary for annealing units (Demo Maschinenbau)",
  },
  namespaceUri,
  version: "2026.1",
  publisher: "Demo Maschinenbau GmbH",
  status: "active",
  metadata: {
    source: 'Abgeleitet aus den Zusatzfeldern des SIMPL-Anlagentyps „Standardmaschine"',
  },
};

export const demoDictionaryEntries = [
  // --- Identification ------------------------------------------------------
  entry("productName", "Anlagenbezeichnung", "Unit name", "string", undefined, true, "public"),
  entry(
    "productModel",
    "Typenbezeichnung",
    "Type designation",
    "string",
    undefined,
    true,
    "public",
  ),
  entry("productCategory", "Anlagenart", "Unit class", "string", undefined, false, "public"),
  entry("serialNumber", "Seriennummer", "Serial number", "string", undefined, false, "controlled"),
  entry("manufacturerName", "Hersteller", "Manufacturer", "string", undefined, true, "public"),
  entry("machineDescription", "Beschreibung", "Description", "string", undefined, false, "public"),

  // --- Dimensions and weight -------------------------------------------------
  // `unit` is set only where the value doesn't already carry the unit.
  entry(
    "dimensions",
    "Abmessungen (B × H × T)",
    "Dimensions (W × H × D)",
    "string",
    "mm",
    false,
    "public",
  ),
  entry("weight", "Gewicht", "Weight", "string", "kg", false, "public"),

  // --- Electrical ratings ----------------------------------------------------
  entry("powerSupply", "Stromversorgung", "Power supply", "string", undefined, false, "public"),
  entry("mainsRating", "Anschlusswerte", "Mains rating", "string", undefined, false, "public"),
  entry(
    "ratedPowerContinuous",
    "Leistung bei 100 % Einschaltdauer",
    "Rated power at 100% duty cycle",
    "string",
    undefined,
    false,
    "public",
  ),
  entry(
    "mainsCable",
    "Anschlusskabel (Querschnitt, Länge, Stecker)",
    "Mains cable (cross-section, length, plug)",
    "string",
    undefined,
    false,
    "controlled",
  ),
  entry(
    "controlVoltageRating",
    "Steuerspannung Anschlusswerte",
    "Control voltage rating",
    "string",
    undefined,
    false,
    "controlled",
  ),
  entry(
    "controlCable",
    "Steuerspannung Anschlusskabel",
    "Control voltage cable",
    "string",
    undefined,
    false,
    "controlled",
  ),
  entry(
    "switchingVoltagePerZone",
    "Schaltspannungen je Zone",
    "Switching voltage per zone",
    "string",
    undefined,
    false,
    "public",
  ),
  entry(
    "switchingCurrentPerZone",
    "Schaltstrom je Zone",
    "Switching current per zone",
    "string",
    "A",
    false,
    "public",
  ),
  entry(
    "fusePerZone",
    "Absicherung je Zone",
    "Fuse rating per zone",
    "string",
    undefined,
    false,
    "public",
  ),

  // --- Control system ----------------------------------------------------
  entry(
    "heatingZones",
    "Heizzonen / Regelzonen",
    "Heating / control zones",
    "string",
    undefined,
    false,
    "public",
  ),
  entry(
    "programController",
    "Programmregler",
    "Programme controller",
    "string",
    undefined,
    false,
    "public",
  ),
  entry("controlRange", "Regelbereich", "Control range", "string", undefined, false, "public"),
  entry(
    "temperatureSensor",
    "Temperatursensor (extern)",
    "Temperature sensor (external)",
    "string",
    undefined,
    false,
    "public",
  ),
  entry("recorder", "Schreiber", "Recorder", "string", undefined, false, "public"),
  entry(
    "transformerCooling",
    "Zwangsbelüftung Transformator",
    "Forced transformer cooling",
    "string",
    undefined,
    false,
    "controlled",
  ),

  // --- Operating conditions ------------------------------------------------
  entry(
    "ambientConditions",
    "Umgebungsbedingungen",
    "Ambient conditions",
    "string",
    undefined,
    false,
    "public",
  ),
  entry(
    "ingressProtection",
    "Schutzart",
    "Ingress protection",
    "string",
    undefined,
    false,
    "public",
  ),
  entry("noiseEmission", "Schallemission", "Noise emission", "string", undefined, false, "public"),
  entry(
    "operatingStatus",
    "Betriebszustand",
    "Operating status",
    "string",
    undefined,
    false,
    "controlled",
  ),

  // --- Compliance and documents ----------------------------------------------
  entry("datasheet", "Datenblatt", "Datasheet", "document", undefined, false, "public"),
  entry(
    "conformityDeclaration",
    "Konformitätserklärung",
    "Declaration of conformity",
    "document",
    undefined,
    false,
    "public",
  ),
];

// The unit's passport. Granularity `item`: this thing has a serial number, it
// is a single piece and not a model.
const demoDpp: DppSnapshot = {
  digitalProductPassportId: "urn:dpp:demo-demo-machinery-unit01",
  productId: "DEMO-UNIT-01",
  granularity: "item",
  dppSchemaVersion: "demo-machinery-anlagen-dpp/2026.1",
  status: "published",
  lastUpdate: "2026-07-28T13:05:29.269Z",
  economicOperatorId: "EO-DEMO_MACHINERY",
  dataElements: [
    single("productName", "Testanlage GreenComplAI", "string", "public"),
    single("productModel", "DEMO UNIT 01", "string", "public"),
    single("productCategory", "Standardmaschine", "string", "public"),
    single("manufacturerName", "Demo Maschinenbau GmbH", "string", "public"),
    single(
      "machineDescription",
      "Fiktive Wärmebehandlungsanlage für die Demonstration des Produktpasses.",
      "string",
      "public",
    ),
  ],
  collections: [
    collection(
      "collection-identification",
      "serialNumber",
      "Identifikation",
      "Identification",
      "controlled",
      [single("serialNumber", "DEMO-SN-0001", "string", "controlled")],
    ),
    collection(
      "collection-dimensions",
      "dimensions",
      "Maße und Gewicht",
      "Dimensions and weight",
      "public",
      [
        single("dimensions", "800x1000x700", "string", "public"),
        single("weight", "250", "string", "public"),
      ],
    ),
    collection(
      "collection-electrical",
      "mainsRating",
      "Elektrische Anschlusswerte",
      "Electrical ratings",
      "public",
      [
        single("powerSupply", "400VAC", "string", "public"),
        single("mainsRating", "400V, 63A", "string", "public"),
        single("ratedPowerContinuous", "24kW", "string", "public"),
        single(
          "mainsCable",
          "NSSHÖU 4x 16mm², 5m CEE-Stecker 5-polig 400V/63A",
          "string",
          "controlled",
        ),
        single("controlVoltageRating", "230V, 50/60Hz", "string", "controlled"),
        single("controlCable", "3x 1,5mm²/ 5m mit Schuko Stecker", "string", "controlled"),
        // Two switching voltages per zone - in the source system a single
        // free-text field "30VAC / 60VAC", here as what it actually is.
        multi(
          "switchingVoltagePerZone",
          [
            value("switchingVoltageLow", "30VAC", "string"),
            value("switchingVoltageHigh", "60VAC", "string"),
          ],
          "public",
        ),
        single("switchingCurrentPerZone", "90", "string", "public"),
        single("fusePerZone", "100A", "string", "public"),
      ],
    ),
    collection(
      "collection-control",
      "programController",
      "Regelung und Steuerung",
      "Control system",
      "public",
      [
        single("heatingZones", "6", "string", "public"),
        single("programController", "DEMO-CTRL-01", "string", "public"),
        single("controlRange", "-20 … +1200°C", "string", "public"),
        single("temperatureSensor", "Typ K (NiCr-Ni)", "string", "public"),
        single("recorder", "Papierschreiber DEMO REC 01", "string", "public"),
        single(
          "transformerCooling",
          "Temperatur gesteuerter 2-stufiger Lüfter",
          "string",
          "controlled",
        ),
      ],
    ),
    collection(
      "collection-operating",
      "ambientConditions",
      "Betrieb",
      "Operating conditions",
      "public",
      [
        single(
          "ambientConditions",
          "-20 ... +40°C, max. 75% rel. Feuchte, nicht kondensierend",
          "string",
          "public",
        ),
        single("ingressProtection", "IP 22", "string", "public"),
        single("noiseEmission", "< 70 dB (A)", "string", "public"),
        single("operatingStatus", "In Betrieb", "string", "controlled"),
      ],
    ),
    collection("collection-documents", "datasheet", "Dokumente", "Documents", "public", [
      document("datasheet", "datasheet", "demo-unit-01-datenblatt.pdf", "public"),
      document(
        "conformity-declaration",
        "conformityDeclaration",
        "demo-unit-01-konformitaetserklaerung.pdf",
        "public",
      ),
    ]),
  ],
};

// A fictional recorder demonstrates a component relationship.
const demoRecorderDpp: DppSnapshot = {
  digitalProductPassportId: "urn:dpp:demo-demo-machinery-rec01",
  productId: "DEMO-REC-01",
  granularity: "model",
  dppSchemaVersion: "demo-machinery-anlagen-dpp/2026.1",
  status: "published",
  lastUpdate: "2026-07-28T13:05:29.269Z",
  economicOperatorId: "EO-DEMO_MACHINERY",
  dataElements: [
    single("productName", "Papierschreiber DEMO REC 01", "string", "public"),
    single("productModel", "DEMO REC 01", "string", "public"),
    single("productCategory", "Komponente", "string", "public"),
    single("manufacturerName", "Demo Maschinenbau GmbH", "string", "public"),
    single("recorder", "6-Kanal Papierschreiber", "string", "public"),
  ],
  collections: [],
};

export const demoDpps: Record<string, DppSnapshot> = {
  [demoDpp.digitalProductPassportId]: demoDpp,
  [demoRecorderDpp.digitalProductPassportId]: demoRecorderDpp,
};

export type DemoDppVersion = {
  versionNumber: number;
  // All four versions below belong to one revision: a version row is written on
  // every save, so they share a label .
  versionLabel: string;
  status: DppSnapshot["status"];
  createdAt: string;
  snapshot: DppSnapshot;
};

// Overrides the value of the named single-value data elements, leaving the rest
// of the snapshot untouched. Used to derive an earlier revision of a DPP.
function withElementValues(snapshot: DppSnapshot, overrides: Record<string, unknown>): DppSnapshot {
  return {
    ...snapshot,
    dataElements: snapshot.dataElements.map((element) =>
      element.kind === "single" && element.elementId in overrides
        ? { ...element, value: overrides[element.elementId] }
        : element,
    ),
  };
}

// The published unit passport has a history: v1 still carried the name from
// the quote, v2 the maintained name, v3 went to review, v4 was published.
// That gives the timeline content - a field change and a status change -
// without anyone having to create it first.
const demoDraftV1 = withElementValues(
  { ...demoDpp, status: "draft", lastUpdate: "2026-07-28T12:25:28.588Z" },
  { "element-productName": "Testanlage (Angebot 4711)" },
);

export const demoDppVersionsByDigitalId: Record<string, DemoDppVersion[]> = {
  [demoRecorderDpp.digitalProductPassportId]: [
    {
      versionNumber: 1,
      versionLabel: "2026.1",
      status: "published",
      createdAt: demoRecorderDpp.lastUpdate,
      snapshot: demoRecorderDpp,
    },
  ],
  [demoDpp.digitalProductPassportId]: [
    {
      versionNumber: 1,
      versionLabel: "2026.1",
      status: "draft",
      createdAt: "2026-07-28T12:25:28.588Z",
      snapshot: demoDraftV1,
    },
    {
      versionNumber: 2,
      versionLabel: "2026.1",
      status: "draft",
      createdAt: "2026-07-28T12:48:11.000Z",
      snapshot: {
        ...demoDpp,
        status: "draft",
        lastUpdate: "2026-07-28T12:48:11.000Z",
      },
    },
    {
      versionNumber: 3,
      versionLabel: "2026.1",
      status: "review",
      createdAt: "2026-07-28T12:59:03.000Z",
      snapshot: {
        ...demoDpp,
        status: "review",
        lastUpdate: "2026-07-28T12:59:03.000Z",
      },
    },
    {
      versionNumber: 4,
      versionLabel: "2026.1",
      status: "published",
      createdAt: "2026-07-28T13:05:29.269Z",
      snapshot: demoDpp,
    },
  ],
};

export const demoRelationshipsByDppId: Record<string, DemoRelationship[]> = {
  // One edge per fact. Storing the reverse direction too would be the same
  // statement twice - and since the query supplies the direction, this single
  // edge reads correctly from both sides: on the unit passport "contains
  // DEMO-REC-01", on the recorder passport "contained in DEMO-UNIT-01".
  [demoDpp.digitalProductPassportId]: [
    {
      id: "demo-rel-recorder",
      sourceDppId: "demo-source-unit01",
      targetDppId: null,
      targetDigitalProductPassportId: demoRecorderDpp.digitalProductPassportId,
      targetProductId: "DEMO-REC-01",
      relationshipType: "contains",
      visibility: "public",
      validFrom: "2026-07-28T00:00:00.000Z",
      validTo: null,
      metadata: {
        note: "Temperaturregistrierung, eingebaut",
      },
    },
  ],
};

function createExternalDemoDpp(dppId: string): DppSnapshot {
  return {
    digitalProductPassportId: dppId,
    productId: "External target",
    granularity: "external-reference",
    dppSchemaVersion: "unknown",
    status: "draft",
    lastUpdate: new Date().toISOString(),
    economicOperatorId: "unknown",
    collections: [],
    dataElements: [single("productName", "External DPP reference", "string", "controlled")],
  };
}

function entry(
  key: string,
  de: string,
  en: string,
  valueType: string,
  unit: string | undefined,
  required: boolean,
  visibility: "public" | "controlled",
  metadata: Record<string, unknown> | null = null,
) {
  const category = entryCategory(key);

  return {
    id: `demo-entry-${key}`,
    organizationId: "demo-org",
    repositoryId: demoDictionaryRepository.id,
    entryKey: key,
    externalId: `demo:${key}`,
    canonicalUri: `${namespaceUri}${key}`,
    version: "2026.1",
    name: { de, en },
    description: {
      de: `${de} gemäß Anlagen-Datenwörterbuch.`,
      en: `${en} according to the unit data dictionary.`,
    },
    valueType,
    unit,
    required,
    visibility,
    standardReference: "EN 18223 semantic model",
    allowedValues: null,
    validationRules: null,
    metadata: {
      ...(metadata ?? {}),
      ...(category ? { category } : {}),
    },
  };
}

// The categories. The import mapping dialog offers these as "category", and
// they become the collections on the passport - add one here and it appears
// there without further work.
function entryCategory(key: string) {
  const categories = {
    identification: {
      description: "Anlagenidentität, Typ und Herkunft.",
      id: "identification",
      name: { de: "Identifikation", en: "Identification" },
    },
    dimensions: {
      description: "Abmessungen und Gewicht der Anlage.",
      id: "dimensions",
      name: { de: "Maße und Gewicht", en: "Dimensions and weight" },
    },
    electrical: {
      description: "Anschlusswerte, Leistung, Kabel und Absicherung.",
      id: "electrical",
      name: { de: "Elektrische Anschlusswerte", en: "Electrical ratings" },
    },
    control: {
      description: "Regelung, Programmsteuerung, Sensorik und Registrierung.",
      id: "control",
      name: { de: "Regelung und Steuerung", en: "Control system" },
    },
    operating: {
      description: "Betriebsbedingungen, Schutzart und Emissionen.",
      id: "operating",
      name: { de: "Betrieb", en: "Operating conditions" },
    },
    compliance: {
      description: "Nachweise, Normen und regulatorische Konformität.",
      id: "compliance",
      name: { de: "Konformität und Dokumente", en: "Compliance and documents" },
    },
  };

  const entryCategories: Record<string, keyof typeof categories> = {
    machineDescription: "identification",
    manufacturerName: "identification",
    productCategory: "identification",
    productModel: "identification",
    productName: "identification",
    serialNumber: "identification",
    dimensions: "dimensions",
    weight: "dimensions",
    controlCable: "electrical",
    controlVoltageRating: "electrical",
    fusePerZone: "electrical",
    mainsCable: "electrical",
    mainsRating: "electrical",
    powerSupply: "electrical",
    ratedPowerContinuous: "electrical",
    switchingCurrentPerZone: "electrical",
    switchingVoltagePerZone: "electrical",
    controlRange: "control",
    heatingZones: "control",
    programController: "control",
    recorder: "control",
    temperatureSensor: "control",
    transformerCooling: "control",
    ambientConditions: "operating",
    ingressProtection: "operating",
    noiseEmission: "operating",
    operatingStatus: "operating",
    conformityDeclaration: "compliance",
    datasheet: "compliance",
  };

  const categoryKey = entryCategories[key];
  return categoryKey ? categories[categoryKey] : null;
}

function single(
  key: string,
  value: unknown,
  valueDataType: string,
  visibility: "public" | "controlled",
) {
  return {
    elementId: `element-${key}`,
    dictionaryReference: `${namespaceUri}${key}`,
    kind: "single" as const,
    value,
    valueDataType,
    visibility,
    publicEligible: visibility === "public",
  };
}

function collection(
  elementId: string,
  dictionaryKey: string,
  de: string,
  en: string,
  visibility: "public" | "controlled",
  dataElements: DppSnapshot["collections"][number]["dataElements"],
) {
  return {
    elementId,
    dictionaryReference: `${namespaceUri}${dictionaryKey}`,
    kind: "collection" as const,
    name: { de, en },
    visibility,
    publicEligible: visibility === "public",
    dataElements,
  };
}

function document(
  elementId: string,
  dictionaryKey: string,
  filename: string,
  visibility: "public" | "controlled",
) {
  const url = `https://docs.greencomplai.example/dpp/${encodeURIComponent(filename)}`;

  return {
    elementId,
    dictionaryReference: `${namespaceUri}${dictionaryKey}`,
    kind: "document" as const,
    blobObjectId: demoBlobId(elementId),
    filename,
    contentType: filename.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
    url,
    visibility,
    publicEligible: visibility === "public",
  };
}

function multi(
  key: string,
  valueList: Array<ReturnType<typeof value>>,
  visibility: "public" | "controlled",
) {
  return {
    elementId: `element-${key}`,
    dictionaryReference: `${namespaceUri}${key}`,
    kind: "multi" as const,
    valueList,
    visibility,
    publicEligible: visibility === "public",
  };
}

function value(elementId: string, value: unknown, valueDataType: string) {
  return {
    elementId,
    dictionaryReference: `${namespaceUri}${elementId}`,
    value,
    valueDataType,
  };
}

// The document elements above name a blob id, and `blob_objects.id` is a uuid.
// The demo therefore has to produce one - a readable `demo-blob-datasheet` was
// a string the snapshot schema accepts and the column does not, so every
// download of a demo document ended in a query error instead of a file.
// Derived from the element id rather than written out, so the id stays the same
// across seeds without a table to keep in sync.
function demoBlobId(elementId: string): string {
  const hex = createHash("sha256").update(`demo-blob-${elementId}`).digest("hex");
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export type DemoBlobObject = {
  content: Buffer;
  contentType: string;
  filename: string;
  id: string;
  isPublic: boolean;
};

// The files behind the demo's document elements. A blob row alone would only
// move the failure: the viewer would hand out a presigned URL for an object
// that is not in the bucket. So the demo carries its own placeholder bytes, and
// the seed stores them like any upload.
export const demoBlobObjects: DemoBlobObject[] = collectDemoBlobObjects();

function collectDemoBlobObjects(): DemoBlobObject[] {
  const byId = new Map<string, DemoBlobObject>();

  for (const dpp of Object.values(demoDpps)) {
    const elements = [
      ...dpp.dataElements,
      ...dpp.collections.flatMap((collection) => collection.dataElements),
    ];

    for (const element of elements) {
      if (element.kind !== "document") continue;

      byId.set(element.blobObjectId, {
        content: demoDocumentPdf(element.filename),
        contentType: element.contentType,
        filename: element.filename,
        id: element.blobObjectId,
        // Mirrors what a publish would derive: the element is public-eligible
        // and published, so the file is downloadable without a session.
        isPublic: element.visibility === "public" && element.publicEligible !== false,
      });
    }
  }

  return [...byId.values()];
}

// A one-page PDF, assembled by hand so the demo needs no binary fixtures in the
// repository. ASCII only: the bytes are written as latin1, and the offsets in
// the xref table are character counts.
function demoDocumentPdf(filename: string): Buffer {
  const text = [
    "GreenComplai DPP - Demo",
    "",
    `Datei: ${filename}`,
    "Organisation: Demo Maschinenbau GmbH (Demo)",
    "",
    "Platzhalter fuer den Beispielpass DEMO UNIT 01.",
    "Kein echtes Dokument, keine Konformitaetsaussage.",
  ];
  const content = [
    "BT",
    "/F1 12 Tf",
    "16 TL",
    "72 760 Td",
    ...text.map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const [index, object] of objects.entries()) {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const startxref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}

function escapePdfText(value: string): string {
  return value.replace(/([\\()])/g, "\\$1");
}
