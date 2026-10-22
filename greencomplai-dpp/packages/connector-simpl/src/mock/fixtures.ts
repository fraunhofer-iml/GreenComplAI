import type { SimplAsset, SimplAssetType, SimplOrganization, SimplPart } from "../api-types.js";

// The data the mock serves.
//
// Typed against the same `api-types.ts` the module reads, so a field that gets
// renamed there breaks the fixtures instead of quietly making the mock serve
// something the connector no longer looks at.
//
// The asset types are the interesting part. They carry the JSON Schema that the
// dictionary draft is built from, and they are deliberately varied: a stated
// type, a date in the `format`, a closed value list, a list of values, and one
// field with no type at all - the case where the platform has to guess and says
// so.
//
// The fictional example unit also appears in the seeded demo tenant. Shared
// identifiers keep import and seed behavior comparable without customer data.

// The seeded demo tenant names these two in `apps/api/src/services/demo.ts`.
// They are the join between the two datasets, so they are written down once.
export const DEMO_MACHINERY_ASSET_TYPE_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_MACHINERY_ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";

export const ASSET_TYPES: SimplAssetType[] = [
  {
    // The seeded demo tenant's type. Its custom fields are the ones the
    // dictionary `demo-machinery-anlagen-dpp` describes, under the same names -
    // which is what lets the mapping step suggest the right entry for each of
    // them instead of leaving twenty fields to be picked by hand.
    //
    // Everything here is `string`, and the unit sits in the value ("24kW",
    // "IP 22"). This fixture exercises the case where
    // custom fields are free text. `unit` is set only on the three fields whose
    // label names a unit and whose value carries just the number - typing the
    // rest as `number` would make every import of this unit fail validation.
    id: DEMO_MACHINERY_ASSET_TYPE_ID,
    title: "Standardmaschine",
    description: "Programmgesteuerte Glühanlagen der Baureihe STE",
    customFields: {
      properties: {
        cf_dimensions: { title: "Abmessungen (B × H × T)", type: "string", unit: "mm" },
        cf_weight: { title: "Gewicht", type: "string", unit: "kg" },
        cf_power_supply: { title: "Stromversorgung", type: "string" },
        cf_mains_rating: { title: "Anschlusswerte", type: "string" },
        cf_rated_power: { title: "Leistung bei 100 % Einschaltdauer", type: "string" },
        cf_mains_cable: {
          title: "Anschlusskabel (Querschnitt, Länge, Stecker)",
          type: "string",
        },
        cf_control_voltage: { title: "Steuerspannung Anschlusswerte", type: "string" },
        cf_control_cable: { title: "Steuerspannung Anschlusskabel", type: "string" },
        // One field, two values. The passport splits it into a multi-valued
        // element - that split is the mapping's work and must not already have
        // happened here, or the case would demo nothing.
        cf_switching_voltage: { title: "Schaltspannungen je Zone", type: "string" },
        cf_switching_current: { title: "Schaltstrom je Zone", type: "string", unit: "A" },
        cf_fuse: { title: "Absicherung je Zone", type: "string" },
        cf_zones: { title: "Heizzonen / Regelzonen", type: "string" },
        cf_controller: { title: "Programmregler", type: "string" },
        cf_control_range: { title: "Regelbereich", type: "string" },
        cf_sensor: { title: "Temperatursensor (extern)", type: "string" },
        cf_recorder: { title: "Schreiber", type: "string" },
        cf_transformer_cooling: { title: "Zwangsbelüftung Transformator", type: "string" },
        cf_ambient: { title: "Umgebungsbedingungen", type: "string" },
        cf_protection: { title: "Schutzart", type: "string" },
        cf_noise: { title: "Schallemission", type: "string" },
      },
    },
  },
  {
    id: "at-pressure",
    title: "Hochdruckanlage",
    description: "Druckführende Anlagen der Baureihe HD",
    customFields: {
      properties: {
        cf_pressure: {
          title: "Betriebsdruck",
          description: "Maximaler Druck im Dauerbetrieb",
          type: "number",
          unit: "bar",
        },
        cf_voltage: { title: "Nennspannung", type: "number", unit: "V" },
        cf_power: { title: "Anschlussleistung", type: "number", unit: "kW" },
        cf_weight: { title: "Leergewicht", type: "number", unit: "kg" },
        cf_material: {
          title: "Werkstoff Druckbehälter",
          type: "string",
          enum: ["Edelstahl 1.4571", "Stahl S355", "Aluminium"],
        },
        cf_efficiency: {
          title: "Energieeffizienzklasse",
          description: "Nach Herstellerangabe, nicht nach Ökodesign-Verordnung",
          type: "string",
          enum: ["A", "B", "C", "D"],
        },
        cf_commissioned: { title: "Inbetriebnahme", type: "string", format: "date" },
        cf_last_service: { title: "Letzte Wartung", type: "string", format: "date-time" },
        cf_ce: { title: "CE-Kennzeichnung vorhanden", type: "boolean" },
        cf_certificates: {
          title: "Prüfzeugnisse",
          type: "array",
          items: { type: "string" },
        },
        // No type at all. SIMPL does not require one, and this is the case the
        // draft has to mark as guessed rather than pass off as known.
        cf_remark: { title: "Bemerkung" },
      },
    },
  },
  {
    id: "at-dryer",
    title: "Trocknungsanlage",
    description: "Umluft- und Schutzgastrockner",
    customFields: {
      properties: {
        cf_airflow: { title: "Luftvolumenstrom", type: "number", unit: "m³/h" },
        cf_temp_max: { title: "Maximale Trocknungstemperatur", type: "number", unit: "°C" },
        cf_medium: { title: "Trocknungsmedium", type: "string", enum: ["Luft", "Stickstoff"] },
        cf_remark: { title: "Bemerkung" },
      },
    },
  },
];

export const ORGANIZATIONS: SimplOrganization[] = [
  {
    // Address deliberately no more precise than the seeded operator's: the
    // mock uses a fictional company and city, matching the demo tenant.
    id: DEMO_MACHINERY_ORGANIZATION_ID,
    title: "Demo Maschinenbau GmbH",
    type: "MANUFACTURER",
    locations: [{ city: "Musterstadt", country: "DE", isPrimary: true }],
  },
  {
    id: "org-100",
    title: "Muster Maschinenbau GmbH",
    type: "MANUFACTURER",
    externalId: "LIEF-100",
    locations: [
      { city: "Hamburg", country: "DE", isPrimary: false, street: "Nebenweg", title: "Lager" },
      {
        buildingNumber: "12a",
        city: "Dortmund",
        country: "DE",
        isPrimary: true,
        postal: "44139",
        region: "Nordrhein-Westfalen",
        street: "Musterstraße",
        title: "Werk 1",
      },
    ],
  },
  {
    id: "org-200",
    title: "Nordluft Systeme GmbH",
    type: "SUPPLIER",
    locations: [
      {
        city: "Bremen",
        // Deliberately not an alpha-2 code: the mapping is supposed to drop it
        // rather than write "Deutschland" into a `countryCode`.
        country: "Deutschland",
        isPrimary: true,
        postal: "28195",
        street: "Hafenstraße",
      },
    ],
  },
];

export const ASSETS: SimplAsset[] = [
  {
    // The unit the demo tenant is seeded with. `externalId` is what the import
    // anchors the product on, so it is the product identifier the seed already
    // carries - a second import lands on that product instead of creating one
    // next to it.
    id: "33333333-3333-4333-8333-333333333333",
    externalId: "DEMO-UNIT-01",
    title: "Testanlage GreenComplAI",
    // The free-text designation, which the mapping reads as the model
    // identifier - not as the category. The category comes from `assetType`.
    type: "DEMO UNIT 01",
    description: "Fiktive Wärmebehandlungsanlage für die Demonstration des Produktpasses.",
    serialNumber: "DEMO-SN-0001",
    status: "RUNNING",
    assetType: { id: DEMO_MACHINERY_ASSET_TYPE_ID, title: "Standardmaschine" },
    manufacturer: {
      id: DEMO_MACHINERY_ORGANIZATION_ID,
      title: "Demo Maschinenbau GmbH",
      type: "MANUFACTURER",
    },
    location: { title: "Prüffeld", city: "Musterstadt", country: "DE" },
    customFields: {
      cf_dimensions: "800x1000x700",
      cf_weight: "250",
      cf_power_supply: "400VAC",
      cf_mains_rating: "400V, 63A",
      cf_rated_power: "24kW",
      cf_mains_cable: "NSSHÖU 4x 16mm², 5m CEE-Stecker 5-polig 400V/63A",
      cf_control_voltage: "230V, 50/60Hz",
      cf_control_cable: "3x 1,5mm²/ 5m mit Schuko Stecker",
      cf_switching_voltage: "30VAC / 60VAC",
      cf_switching_current: "90",
      cf_fuse: "100A",
      cf_zones: "6",
      cf_controller: "DEMO-CTRL-01",
      // As the source system spells it. The passport reads "-20 … +1200°C" -
      // that tidying is a decision someone made on import, and a mock that
      // served the tidy form would hide that anyone had to make it.
      cf_control_range: "-20....+1200C",
      cf_sensor: "Typ K (NiCr-Ni)",
      cf_recorder: "Papierschreiber DEMO REC 01",
      cf_transformer_cooling: "Temperatur gesteuerter 2-stufiger Lüfter",
      cf_ambient: "-20 ... +40°C, max. 75% rel. Feuchte, nicht kondensierend",
      cf_protection: "IP 22",
      cf_noise: "< 70 dB (A)",
    },
    resources: [
      {
        id: "res-unit01-datenblatt",
        name: "demo-unit-01-datenblatt.pdf",
        type: "DOCUMENT",
        isPublic: true,
      },
      {
        id: "res-unit01-konformitaet",
        name: "demo-unit-01-konformitaetserklaerung.pdf",
        type: "DOCUMENT",
        isPublic: true,
      },
    ],
    updatedAt: "2026-07-28T13:05:29.269Z",
  },
  {
    id: "a-1001",
    externalId: "ERP-1001",
    title: "Hochdruckaggregat HD-450",
    type: "HD-450 TC",
    description: "Steht in Halle 3, Linie 2",
    serialNumber: "SN-1001",
    status: "RUNNING",
    assetType: { id: "at-pressure", title: "Hochdruckanlage" },
    manufacturer: { id: "org-100", title: "Muster Maschinenbau GmbH", type: "MANUFACTURER" },
    location: { title: "Werk Dortmund", city: "Dortmund", country: "DE" },
    customFields: {
      cf_pressure: 450,
      cf_voltage: 400,
      cf_power: 22,
      cf_weight: 1850,
      cf_material: "Edelstahl 1.4571",
      cf_efficiency: "B",
      cf_commissioned: "2024-03-18",
      cf_last_service: "2026-05-04T09:30:00Z",
      cf_ce: true,
      cf_certificates: ["TÜV-2024-8891", "DGUV-2025-114"],
      cf_remark: "Zusatzfilter nachgerüstet",
      // Empty values are not values. Present so the mapping's filter has
      // something to filter.
      cf_unused: "",
    },
    resources: [
      { id: "res-1", name: "Datenblatt.pdf", type: "DOCUMENT", isPublic: true },
      { id: "res-2", name: "Typenschild.png", type: "IMAGE", isPublic: false },
    ],
    updatedAt: "2026-07-01T10:00:00Z",
  },
  {
    // Same type as the one above: the second import of this kind should start
    // with the mapping already filled in.
    id: "a-1002",
    externalId: "ERP-1002",
    title: "Hochdruckaggregat HD-450",
    type: "HD-450 TC",
    serialNumber: "SN-1002",
    status: "NEW",
    assetType: { id: "at-pressure", title: "Hochdruckanlage" },
    manufacturer: { id: "org-100", title: "Muster Maschinenbau GmbH", type: "MANUFACTURER" },
    location: { title: "Werk Bremen", city: "Bremen", country: "DE" },
    customFields: {
      cf_pressure: 480,
      cf_voltage: 400,
      cf_power: 22,
      cf_weight: 1875,
      cf_material: "Stahl S355",
      cf_efficiency: "C",
      cf_commissioned: "2026-02-02",
      cf_ce: true,
      cf_certificates: ["TÜV-2026-0042"],
    },
    resources: [],
    updatedAt: "2026-08-14T07:15:00Z",
  },
  {
    id: "a-2001",
    externalId: "ERP-2001",
    title: "Trocknungsanlage TR-20",
    type: "TR-20",
    serialNumber: "SN-2001",
    status: "WARNING",
    assetType: { id: "at-dryer", title: "Trocknungsanlage" },
    manufacturer: { id: "org-200", title: "Nordluft Systeme GmbH", type: "SUPPLIER" },
    location: { title: "Werk Bremen", city: "Bremen", country: "DE" },
    customFields: {
      cf_airflow: 12000,
      cf_temp_max: 180,
      cf_medium: "Stickstoff",
      cf_remark: "Wartungsintervall verkürzt",
    },
    resources: [{ id: "res-1", name: "Datenblatt.pdf", type: "DOCUMENT", isPublic: true }],
    updatedAt: "2026-06-20T12:00:00Z",
  },
  {
    // No asset type, hence no typed custom fields: the "Anlage ohne Typ" path,
    // where all records share one mapping.
    id: "a-3001",
    externalId: "ERP-3001",
    title: "Altbestand Kreiselpumpe",
    description: "Übernommen aus dem Vorgängersystem",
    serialNumber: "SN-3001",
    status: "INACTIVE",
    customFields: { cf_remark: "Keine Typzuordnung im Altbestand" },
    resources: [],
    updatedAt: "2026-01-09T08:00:00Z",
  },
];

export const PARTS: SimplPart[] = [
  {
    id: "p-5001",
    externalId: "ART-5001",
    name: "Dichtungssatz HD-450",
    article: "ART-5001",
    description: "Verschleißteilsatz für die Baureihe HD",
    storageLocation: "Lager 2, Regal C",
    manufacturer: { id: "org-100", title: "Muster Maschinenbau GmbH", type: "MANUFACTURER" },
    updatedAt: "2026-05-30T14:20:00Z",
  },
];

// The bytes behind `/v1/resources/{id}/file`. Small but real: the platform
// checks the signature against the actual bytes, so a text file called .pdf
// would be rejected - which is correct behaviour and a bad demo.
export const RESOURCES: Record<string, { body: Buffer; contentType: string; name: string }> = {
  "res-1": { body: minimalPdf(), contentType: "application/pdf", name: "Datenblatt.pdf" },
  "res-2": { body: minimalPng(), contentType: "image/png", name: "Typenschild.png" },
  "res-unit01-datenblatt": {
    body: minimalPdf(),
    contentType: "application/pdf",
    name: "demo-unit-01-datenblatt.pdf",
  },
  "res-unit01-konformitaet": {
    body: minimalPdf(),
    contentType: "application/pdf",
    name: "demo-unit-01-konformitaetserklaerung.pdf",
  },
};

function minimalPdf(): Buffer {
  const objects = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj",
  ];

  return Buffer.from(`%PDF-1.4\n${objects.join("\n")}\ntrailer<</Root 1 0 R>>\n%%EOF\n`, "latin1");
}

// A 1x1 transparent PNG. Base64 rather than assembled by hand: the CRCs have to
// be right, and a hand-built chunk that fails a checksum would look like a bug
// in the platform's file inspection.
function minimalPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}
