import { z } from "zod";

import type { ConnectorAuthSpec } from "./auth.js";
import type { AllowedRoute, ReadOnlyHttpClient } from "./http.js";

// The contract between the platform and a connector module.
//
// This package is deliberately the **only** surface a module may know. It
// depends on nothing from the platform - not the database, not Hono, not the
// domain packages. A module that had to import `@dpp/db` to do its job would
// no longer be a module but a part of the core in its own file; and a
// boundary you can bypass is not a boundary.
//
// The narrowness of this surface is also what keeps a later split between
// core and connectors open: what a module needs is listed here, and whoever
// wants to serve it from a different package later only has to fulfill this
// contract.

// A configuration field the operator fills in during installation. The
// platform builds the form from it - a module ships no UI of its own.
export type ConnectorConfigField = {
  key: string;
  label: string;
  description?: string;
  // `secret` decides two things: the field is entered masked **and** its
  // value moves into the database encrypted rather than into the open
  // configuration. Credentials are never written to a row in plain text.
  secret: boolean;
  required: boolean;
  placeholder?: string;
};

export type ConnectorManifest = {
  // Stable key. It lives in the database, in routes, and in the identifiers
  // of imported products - it is not a display name and is never renamed.
  key: string;
  name: string;
  description: string;
  version: string;
  vendor: string;
  // The base URL this module talks to. It belongs in the manifest, not in
  // the configuration: a module's target host is a property of the module,
  // not a setting of the operator. Were it configurable, the allowlist below
  // could be circumvented by pointing at a different server.
  baseUrl: string;
  // The endpoints this module may call. They live in the manifest rather
  // than in module code so they are individually readable and individually
  // reviewable - a list someone can go through, instead of an intent that
  // would have to be pieced together from calls. What is missing here is
  // unreachable.
  allowlist: AllowedRoute[];
  // How the module authenticates - described, not executed (see auth.ts).
  auth: ConnectorAuthSpec;
  // The limits the other side commits to. Honoring them is cheaper than any
  // fallback strategy.
  rateLimit?: { requestsPerSecond: number; burst: number };
  configFields: ConnectorConfigField[];
  // What the module can do. The catalogue shows the UI based on this; the
  // platform checks whether a call is permitted at all based on this too.
  capabilities: ConnectorCapability[];
};

// Deliberately coarse and deliberately read-only. There is no capability
// that writes - not because none is needed yet, but because this enum is
// where a write path would first have to appear.
export type ConnectorCapability =
  // Fetch an object by its external, source-system-unique identifier.
  | "lookupByExternalId"
  // List and download documents belonging to an object.
  | "documents";

// The normalized form in which a module delivers a product. It is
// deliberately poorer than any source system: it holds what a DPP product
// needs, and lifts everything else unchanged into `attributes` instead of
// inventing it. Deliberately the same enum as the platform's product
// catalogue, not a separate one next to it. A second vocabulary would need a
// translation table, and that is where an identifier type would quietly get
// lost as either side grows. A module that cannot map its identifier to any
// known type delivers it as an attribute - not as a made-up type.
export const externalIdentifierSchema = z.object({
  type: z.enum(["gtin", "serialNumber", "batch", "model", "sku", "other"]),
  value: z.string().min(1),
  issuer: z.string().optional(),
});

export const externalAddressSchema = z.object({
  street: z.string().optional(),
  buildingNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  // ISO 3166-1 alpha-2, if the source system provides it.
  countryCode: z.string().optional(),
});

export const externalOperatorSchema = z.object({
  externalId: z.string().min(1),
  legalName: z.string().min(1),
  roles: z
    .array(
      z.enum([
        "manufacturer",
        "importer",
        "distributor",
        "authorizedRepresentative",
        "serviceProvider",
        "recycler",
        "authority",
      ]),
    )
    .default(["manufacturer"]),
  address: externalAddressSchema.optional(),
});

// A field from the source system that matches no catalogue property. It is
// not dropped, but it also does not silently become a data element: mapping
// it to a dictionary entry is a business decision and belongs in the
// preview, not in the import.
const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

// What kind of value a field holds - as the *source system's* schema states
// it, not as guessed from the value.
//
// The list is deliberately a subset of the platform's value types and
// deliberately spelled out here rather than imported: this package depends on
// nothing from the platform, and a shared enum would be the first thread of
// exactly that dependency. What is missing from the subset - `object`,
// `array`, `document` - the platform can see for itself: whether a value is a
// list is visible in the value.
export const externalFieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "enum",
]);

export const externalAttributeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  // A list stays a list. Joining it into a string would be convenient and
  // would destroy the shape a passport needs for a multi-valued data
  // element - a shape that could not be recovered from the string.
  value: z.union([scalarSchema, z.array(scalarSchema)]),
  unit: z.string().optional(),
  // The following three describe the **field**, not this record's value. They
  // exist only where the source system carries a schema of its own - SIMPL
  // does, in the asset type's JSON Schema. Where it does not, they stay
  // empty; an inferred type would be a guess dressed up as a statement.
  //
  // They are here because a dictionary entry needs exactly this: a name, a
  // description, a value type, a unit. Without them the platform can only
  // offer the field name, and a dictionary drafted from field names alone is
  // a list of labels, not a vocabulary.
  description: z.string().optional(),
  valueType: externalFieldTypeSchema.optional(),
  // The values the source system permits. Only meaningful with
  // `valueType: "enum"` - elsewhere it would claim a closed list where the
  // source system has none.
  allowedValues: z.array(scalarSchema).optional(),
});

export const externalDocumentSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

// The kind of record as the source system itself tracks it - for SIMPL the
// asset type, elsewhere a material class or item group.
//
// It is the key the field mapping hangs off. That is why it is in the
// contract at all: a record's fields do not repeat per object but per kind.
// Whoever decides once where a kind's extra fields belong has decided it for
// every object of that kind - and does not have to make the same decision
// again on every import.
//
// Without it, all of a module's records share one mapping. That is correct
// for modules with a flat data world and the worse, but still working, case
// for the rest.
export const externalSourceTypeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

export const externalProductSchema = z.object({
  // The identifier under which the object is unique in the source system. It
  // is the anchor for re-import: the same value finds the same product again
  // instead of creating a second one.
  externalId: z.string().min(1),
  sourceType: externalSourceTypeSchema.optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  identifiers: z.array(externalIdentifierSchema).default([]),
  manufacturer: externalOperatorSchema.optional(),
  attributes: z.array(externalAttributeSchema).default([]),
  documents: z.array(externalDocumentSchema).default([]),
  // When the object was last changed in the source system, as an ISO timestamp.
  updatedAt: z.string().optional(),
});

export type ExternalIdentifier = z.infer<typeof externalIdentifierSchema>;
export type ExternalOperator = z.infer<typeof externalOperatorSchema>;
export type ExternalAttribute = z.infer<typeof externalAttributeSchema>;
export type ExternalFieldType = z.infer<typeof externalFieldTypeSchema>;
export type ExternalDocument = z.infer<typeof externalDocumentSchema>;
export type ExternalProduct = z.infer<typeof externalProductSchema>;
export type ExternalSourceType = z.infer<typeof externalSourceTypeSchema>;

// What a module gets at runtime - and exclusively that.
//
// In particular it does **not** get `fetch`. The only way out is `http`,
// which lets only reads through (see http.ts). That a module in Node
// *could* reach around this boundary is true and noted in the comment
// there: for the bundled modules this is the boundary, for third-party
// modules it would need its own process. The interface is cut so that this
// step later requires no rework of the modules.
export type ConnectorContext = {
  http: ReadOnlyHttpClient;
  // The non-secret configuration values of the installation. The context
  // does not know secret fields: they become headers the HTTP client sets,
  // and never reach module code.
  config: Readonly<Record<string, string>>;
  log(message: string, detail?: Record<string, unknown>): void;
};

export type Connector = {
  manifest: ConnectorManifest;
  // Checks the credentials without importing anything - the "test
  // connection" button. A module answers this with a cheap read call.
  checkConnection(context: ConnectorContext): Promise<void>;
  // The path the application actually takes: a unique identifier in, a
  // normalized product out. `undefined` means "does not exist there" and is
  // not an error.
  lookupByExternalId(
    context: ConnectorContext,
    externalId: string,
  ): Promise<ExternalProduct | undefined>;
  // Downloads a document. Only present if the manifest lists `documents`.
  downloadDocument?(
    context: ConnectorContext,
    externalDocumentId: string,
  ): Promise<{ body: ArrayBuffer; mimeType: string } | undefined>;
};

// Errors the platform needs to distinguish in order to tell the user
// something true. Everything else is a module bug and is treated as one
// (500), not as a statement about the source system.
export class ConnectorAuthError extends Error {
  readonly code = "CONNECTOR_AUTH_FAILED";
}

export class ConnectorUnavailableError extends Error {
  readonly code = "CONNECTOR_UNAVAILABLE";
}

export class ConnectorRateLimitError extends Error {
  readonly code = "CONNECTOR_RATE_LIMITED";
}
