import { z } from "zod";

export const resultMessageSchema = z.object({
  messageType: z.enum(["Info", "Warning", "Error"]),
  text: z.string().min(1),
  code: z.string().optional(),
  correlationId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export const resultSchema = z.object({
  messages: z.array(resultMessageSchema),
});

export const dppStatusSchema = z.enum(["draft", "review", "published", "archived"]);
export const organizationRoleSchema = z.enum(["admin", "editor", "viewer", "authority"]);
export const visibilitySchema = z.enum(["public", "controlled"]);
// Both are Postgres enums (membership_status, invitation_status). As
// `z.string()` the schema did not describe the boundary, and a client that
// branches on the status had no list to check it against.
export const membershipStatusSchema = z.enum(["invited", "active", "disabled"]);
export const invitationStatusSchema = z.enum(["pending", "accepted", "revoked"]);
export const productLifecycleStatusSchema = z.enum(["concept", "active", "endOfLife", "recalled"]);
export const productIdentifierTypeSchema = z.enum([
  "gtin",
  "serialNumber",
  "batch",
  "model",
  "sku",
  "other",
]);
export const facilityTypeSchema = z.enum([
  "manufacturing",
  "assembly",
  "testing",
  "warehouse",
  "recycling",
  "repair",
  "other",
]);
export const economicOperatorRoleSchema = z.enum([
  "manufacturer",
  "importer",
  "distributor",
  "authorizedRepresentative",
  "serviceProvider",
  "recycler",
  "authority",
]);
export const dataValueTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "enum",
  "object",
  "array",
  "document",
]);
export const dppRelationshipTypeSchema = z.enum([
  "contains",
  "isComponentOf",
  "replaces",
  "isVariantOf",
  "derivedFrom",
  "hasPackaging",
  "hasSparePart",
]);

export const elementPolicySchema = z.object({
  readRoles: z.array(organizationRoleSchema),
  writeRoles: z.array(organizationRoleSchema),
});

export const dppCoreSchema = z.object({
  digitalProductPassportId: z.string().min(1),
  productId: z.string().min(1),
  granularity: z.string().min(1),
  dppSchemaVersion: z.string().min(1),
  status: dppStatusSchema,
  lastUpdate: z.string().datetime(),
  economicOperatorId: z.string().min(1),
  facilityId: z.string().optional(),
});

export const translatableStringSchema = z.record(z.string().min(1), z.string());

// An identifier as it is read: type, value, and optionally the issuing body.
export const productIdentifierInputSchema = z.object({
  identifierType: productIdentifierTypeSchema,
  identifierValue: z.string().min(1),
  issuer: z.string().min(1).optional(),
});

// Two accepted input shapes, deliberately, not out of indecision:
//
// The **array** is the correct one - it matches the response shape, can carry
// `issuer`, and allows several identifiers of the same type (the unique index
// is on type **and** value, so two batch numbers are fine). The **map** can do
// neither; it was the original shape and is structurally poorer than the table
// it writes to.
//
// It stays valid regardless: `/v1` is published under a promise that additive
// changes are allowed and breaking ones go to `/v2` (SPEC.md 6.0). Removing a
// shape a client might be using would be a breaking change; adding one next to
// it is not. Both are normalized to the array immediately, so only one shape
// exists past this branch.
export const productIdentifiersInputSchema = z
  .union([
    z.array(productIdentifierInputSchema),
    // partialRecord, not record: with an enum key type, Zod v4's `record` is
    // exhaustive - it demanded every identifier type at once, so creating a
    // product with just a GTIN was rejected.
    z.partialRecord(productIdentifierTypeSchema, z.string().min(1)),
  ])
  .transform((value) =>
    Array.isArray(value)
      ? value
      : Object.entries(value)
          .filter(([, identifierValue]) => Boolean(identifierValue))
          .map(([identifierType, identifierValue]) => ({
            identifierType: identifierType as z.infer<typeof productIdentifierTypeSchema>,
            identifierValue: identifierValue as string,
          })),
  );

export const createProductSchema = z.object({
  productId: z.string().min(1),
  name: translatableStringSchema,
  category: z.string().min(1).optional(),
  manufacturerProductId: z.string().min(1).optional(),
  lifecycleStatus: productLifecycleStatusSchema.default("active"),
  identifiers: productIdentifiersInputSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const patchProductSchema = createProductSchema.omit({ productId: true }).partial();

export const createEconomicOperatorSchema = z.object({
  operatorId: z.string().min(1),
  legalName: z.string().min(1),
  roles: z.array(economicOperatorRoleSchema).min(1),
  countryCode: z.string().length(2).optional(),
  vatId: z.string().min(1).optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const patchEconomicOperatorSchema = createEconomicOperatorSchema
  .omit({ operatorId: true })
  .partial();

export const createFacilitySchema = z.object({
  facilityId: z.string().min(1),
  name: z.string().min(1),
  facilityType: facilityTypeSchema.default("manufacturing"),
  // Business key of the operating economic operator. Optional because not
  // every facility is assigned to a recorded operator; when set, it must be
  // resolvable .
  operatorId: z.string().min(1).optional(),
  countryCode: z.string().length(2).optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const patchFacilitySchema = createFacilitySchema.omit({ facilityId: true }).partial();

// --- ESRS requirement profiles on the dictionary ---------------------------

// Only the selection, never the content: the catalog belongs to the platform.
// A tenant that could edit which datapoints belong to a requirement could
// satisfy it by making it smaller.
export const setEsrsProfilesSchema = z.object({
  profileKeys: z.array(z.string().min(1)).max(20),
});

const esrsProfileDatapointSchema = z.object({
  canonicalUri: z.string(),
  description: z.string(),
  entryKey: z.string(),
  name: z.string(),
  required: z.boolean(),
  unit: z.string().optional(),
  valueType: dataValueTypeSchema,
  visibility: visibilitySchema,
});

export const esrsProfileSchema = z.object({
  category: z.object({ description: z.string(), id: z.string(), name: z.string() }),
  datapoints: z.array(esrsProfileDatapointSchema),
  description: z.string(),
  key: z.string(),
  label: z.string(),
  // Visible on the profile, not in a footnote: the profiles show which product
  // data the disclosures need - they are a working aid, not legal advice.
  maturity: z.literal("provisional"),
  standard: z.enum(["E1", "E2", "E3", "E4", "E5"]),
});

export const esrsProfilesResponseSchema = z.object({
  enabled: z.array(z.string()),
  profiles: z.array(esrsProfileSchema),
  repositoryVersion: z.string(),
});

// What actually happened - not "succeeded", but what was created.
export const esrsProfileApplicationResponseSchema = z.object({
  // Entries that already exist under the same key but mean something
  // different. They are left untouched and not hidden: what a tenant calls
  // "weight" might be packaging weight.
  conflicts: z.array(
    z.object({
      canonicalUri: z.string(),
      entryKey: z.string(),
      existingCanonicalUri: z.string().nullable(),
    }),
  ),
  created: z.array(z.string()),
  enabled: z.array(z.string()),
  existing: z.array(z.string()),
  // Set when the version was bound to published passports and was therefore
  // copied instead .
  forkedTo: z.string().optional(),
});

// --- Upgrading to a new dictionary version ---------------------------------

// What an upgrade would do. Deliberately a preview: the switch can bring
// required fields that block publishing and can break mappings. Both belong
// before the decision, not after it.
export const dictionaryUpgradeResponseSchema = z.object({
  candidates: z.array(
    z.object({
      diff: z.object({
        added: z.array(
          z.object({
            entryKey: z.string(),
            required: z.boolean(),
            valueType: z.string(),
          }),
        ),
        // Entries that dropped out. Values in the passport are left in place -
        // deleting them would be data loss - but lose their mapping.
        removed: z.array(z.object({ entryKey: z.string(), usedByPassport: z.boolean() })),
        // Required fields of the target version the passport does not carry.
        // This exact list stands between the upgrade and the next publish.
        requiredMissing: z.array(z.string()),
        typeChanged: z.array(z.object({ entryKey: z.string(), from: z.string(), to: z.string() })),
      }),
      // The value that must be written to `dppSchemaVersion`.
      dppSchemaVersion: z.string(),
      status: z.string(),
      version: z.string(),
    }),
  ),
  current: z.object({ repositoryKey: z.string(), version: z.string() }),
});

// --- Sustainability reporting (ESRS feed) -----------------------------------

// The reference date the assortment is viewed as of. With timezone, for the
// same reason as the historical query: otherwise the same text is a different
// moment depending on the reader.
export const sustainabilityQuerySchema = z.object({
  asOf: z.iso.datetime({ offset: true }),
});

// --- Technical credentials ------------------------------------------

export const apiScopeSchema = z.enum(["read", "write"]);

export const createServiceAccountSchema = z.object({
  name: z.string().min(1).max(100),
  // Same role list as for humans: a second permission hierarchy alongside it
  // would mean two answers to "who is allowed to do this".
  role: organizationRoleSchema.default("viewer"),
  scopes: z.array(apiScopeSchema).min(1),
});

export const patchServiceAccountSchema = z.object({
  status: z.enum(["active", "disabled"]),
});

export const createApiKeySchema = z.object({
  label: z.string().min(1).max(100).optional(),
  // Expiry optional, but with a timezone - same reasoning as for the
  // historical query: without it, the same text is a different moment
  // depending on the reader.
  expiresAt: z.iso.datetime({ offset: true }).optional(),
});

export const createDataDictionaryRepositorySchema = z.object({
  repositoryKey: z.string().min(1),
  name: translatableStringSchema,
  namespaceUri: z.url(),
  version: z.string().min(1),
  publisher: z.string().min(1).optional(),
  status: z.enum(["draft", "active", "retired"]).default("draft"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const patchDataDictionaryRepositorySchema = createDataDictionaryRepositorySchema
  .omit({ repositoryKey: true })
  .partial();

export const createDataDictionaryEntrySchema = z.object({
  repositoryId: z.uuid().optional(),
  repositoryKey: z.string().min(1).optional(),
  entryKey: z.string().min(1),
  externalId: z.string().min(1).optional(),
  canonicalUri: z.url().optional(),
  version: z.string().min(1).optional(),
  name: translatableStringSchema,
  description: translatableStringSchema.optional(),
  valueType: dataValueTypeSchema,
  unit: z.string().min(1).optional(),
  required: z.boolean().default(false),
  visibility: visibilitySchema.default("controlled"),
  standardReference: z.string().min(1).optional(),
  allowedValues: z.array(z.unknown()).optional(),
  validationRules: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const patchDataDictionaryEntrySchema = createDataDictionaryEntrySchema
  .omit({ entryKey: true })
  .partial();

const baseDataElementSchema = z.object({
  elementId: z.string().min(1),
  dictionaryReference: z.string().optional(),
  name: translatableStringSchema.optional(),
  visibility: visibilitySchema,
  policy: elementPolicySchema.optional(),
  publicEligible: z.boolean().optional(),
});

export const valueElementSchema = z.object({
  elementId: z.string().min(1),
  dictionaryReference: z.string().optional(),
  name: translatableStringSchema.optional(),
  value: z.unknown(),
  valueDataType: z.string().min(1),
  language: z.string().optional(),
});

export const dataElementSchema = z.discriminatedUnion("kind", [
  baseDataElementSchema.extend({
    kind: z.literal("single"),
    value: z.unknown(),
    valueDataType: z.string().optional(),
    language: z.string().optional(),
  }),
  baseDataElementSchema.extend({
    kind: z.literal("multi"),
    valueList: z.array(valueElementSchema).min(1),
  }),
  baseDataElementSchema.extend({
    kind: z.literal("document"),
    blobObjectId: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().min(1),
    url: z.url().optional(),
  }),
]);

export const dataElementCollectionSchema = baseDataElementSchema.extend({
  kind: z.literal("collection"),
  dataElements: z.array(dataElementSchema).min(1),
});

export const dppSnapshotSchema = dppCoreSchema.extend({
  collections: z.array(dataElementCollectionSchema),
  dataElements: z.array(dataElementSchema),
});

export const createDppSchema = z.object({
  productId: z.string().min(1),
  granularity: z.string().min(1),
  dppSchemaVersion: z.string().min(1),
  economicOperatorId: z.string().min(1),
  facilityId: z.string().optional(),
  collections: z.array(dataElementCollectionSchema).default([]),
  dataElements: z.array(dataElementSchema).default([]),
});

// `status` is intentionally omitted: status changes must go through the
// lifecycle endpoints (transitionDppStatus), never via a raw snapshot patch.
export const patchDppSchema = z.object({
  snapshot: dppSnapshotSchema.partial().omit({ status: true }).optional(),
  patch: z.unknown().optional(),
  // Optional user override of the auto-assigned revision label . Sits
  // beside the snapshot because it is not part of the normed DPP shape.
  versionLabel: z
    .string()
    .regex(/^\d{4}\.[1-9]\d*$/, "Expected a version label like 2026.2")
    .optional(),
});

// The DPP's status is a resource that gets set, not four separate verbs. The
// allowed transitions are decided server-side (canTransitionDppStatus), as is
// who may reach which target - publishing is admin-only (four-eyes, ).
export const setDppStatusSchema = z.object({
  status: dppStatusSchema,
  // Review comment or archive reason; recorded in the audit trail.
  comment: z.string().trim().min(1).optional(),
});

// --- Query parameters -------------------------------------------------------
//
// A query parameter is an input like a body. Clamping (e.g. `?limit=100000`
// silently capped to 100) hid whether a caller got 100 results because there
// were only 100, or because the server quietly answered a different question
// than the one asked. An oversized page is therefore **rejected** (422), not
// coerced - the same line as for the body: a readable request whose content is
// rejected.
//
// One place stays lenient: an empty filter (`?search=`) unambiguously means
// "no filter" and becomes `undefined` instead of punishing an empty input
// field with a 422. That leniency lives in one wrapper, not per field, since
// it applies to every filter the same way. The outer `.optional()` is not
// redundant with the inner one: the inner one catches the empty value *after*
// preprocessing; the outer one tells the object (and thus the OpenAPI
// document) that the parameter may be absent altogether.
const emptyAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional()).optional();

const optionalFilter = (max: number) =>
  emptyAsUndefined(z.string().trim().max(max)).meta({
    type: "string",
    maxLength: max,
  });

// Hono passes a singly-set parameter through as a string and a repeated one
// (`?productId=a&productId=b`) as an array. Both mean the same thing, so the
// schema normalizes them to one.
const repeatable = (max: number) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .pipe(z.array(z.string().min(1)).max(max))
    .meta({
      description: `Wiederholbar: einfach oder mehrfach gesetzt, höchstens ${max} Werte`,
    });

export const dppListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  // Capped because a very large offset means a full table scan per request -
  // pagination that doubles as a denial-of-service vector is not pagination.
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  productId: repeatable(200).optional(),
  search: optionalFilter(200),
  status: emptyAsUndefined(dppStatusSchema).meta({
    type: "string",
    enum: [...dppStatusSchema.options],
  }),
});

// Without an explicit version, the latest one answers - the one an editor is
// currently working on.
export const dictionaryEntryQuerySchema = z.object({
  version: optionalFilter(100),
});

// The point in time for the historical query (EN 18222 Table 17
// `ReadDPPVersionByProductIdAndDate`).
//
// **With timezone, no exceptions.** `2026-03-01T10:00:00` is a different
// moment depending on the reader, and here an hour decides which version
// answers. Zod's `offset: true` also accepts `+02:00`, not just `Z`; a
// timestamp without a zone is rejected rather than guessed as UTC - guessing
// would be an answer to a different question than the one asked.
export const dppVersionAtDateQuerySchema = z.object({
  date: z.iso.datetime({ offset: true }),
});

// Public and required: without a product ID there is nothing to resolve.
export const publicDppQuerySchema = z.object({
  productId: z.string().trim().min(1).max(200),
});

// The body of a fine-grained patch (EN 18222 Table 19). Deliberately
// `z.unknown()` instead of a partial element schema: merging follows RFC
// 7396, where `null` **deletes** - a `.partial()` schema would reject exactly
// that deletion instruction as a type error. What comes out after merging is
// checked by `dataElementSchema` on save regardless.
export const elementMergePatchSchema = z.unknown();

export const dataElementResponseSchema = dataElementSchema;
export const dataElementCollectionResponseSchema = dataElementCollectionSchema;

// --- Bulk creation and export (G27/G28) ------------------------------------

// The upper bound is an operational decision, not a business one: a request
// must stay answerable in reasonable time and must not tip the process over
// on memory. Anyone with more sends several batches - the import is
// idempotent, so that is safe.
export const dppImportSchema = z.object({
  dpps: z.array(createDppSchema).min(1).max(500),
});

export const importRowOutcomeSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  productId: z.string(),
  publicId: z.string().optional(),
  status: z.enum(["created", "updated", "skipped", "failed"]),
});

// The report names both the totals **and** every row. Totals alone would say
// "17 failed" without saying which ones - an import that can only be blindly
// retried.
export const dppImportReportSchema = z.object({
  created: z.number(),
  failed: z.number(),
  rows: z.array(importRowOutcomeSchema),
  skipped: z.number(),
  updated: z.number(),
});

export const dppExportQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  status: emptyAsUndefined(dppStatusSchema).meta({
    type: "string",
    enum: [...dppStatusSchema.options],
  }),
});

export const createDppRelationshipSchema = z
  .object({
    targetDigitalProductPassportId: z.string().min(1),
    targetProductId: z.string().min(1).optional(),
    relationshipType: dppRelationshipTypeSchema,
    visibility: visibilitySchema.default("controlled"),
    validFrom: z.string().datetime().optional(),
    validTo: z.string().datetime().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => !value.validTo || !value.validFrom || value.validTo > value.validFrom, {
    message: "validTo must be after validFrom",
    path: ["validTo"],
  });

export const createOrganizationSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: organizationRoleSchema,
});

// One patch for the membership. Role and status are two fields of one resource;
// PATCHing one and POSTing the other made them look like two.
export const patchMemberSchema = z
  .object({
    role: organizationRoleSchema.optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "Provide at least one of role or status",
  });

// DIN EN 18222 Tabelle 17 `dppsByProductIds`: a set of product IDs is supplied
// in the request body (POST), not as query parameters.
export const dppsByProductIdsSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(200),
  limit: z.number().int().min(1).max(200).optional(),
  cursor: z.string().min(1).optional(),
});

export type CreateDppInput = z.infer<typeof createDppSchema>;
export type SetDppStatusInput = z.infer<typeof setDppStatusSchema>;
export type CreateDppRelationshipInput = z.infer<typeof createDppRelationshipSchema>;
export type CreateDataDictionaryEntryInput = z.infer<typeof createDataDictionaryEntrySchema>;
export type CreateDataDictionaryRepositoryInput = z.infer<
  typeof createDataDictionaryRepositorySchema
>;
export type CreateEconomicOperatorInput = z.infer<typeof createEconomicOperatorSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type ProductIdentifierInput = z.infer<typeof productIdentifierInputSchema>;
export type PatchDppInput = z.infer<typeof patchDppSchema>;
export type PatchDataDictionaryEntryInput = z.infer<typeof patchDataDictionaryEntrySchema>;
export type PatchDataDictionaryRepositoryInput = z.infer<
  typeof patchDataDictionaryRepositorySchema
>;
export type PatchEconomicOperatorInput = z.infer<typeof patchEconomicOperatorSchema>;
export type PatchProductInput = z.infer<typeof patchProductSchema>;

// --- Response schemas -------------------------------------------------------
//
// What leaves the API, declared rather than left to whatever a service happened
// to return. These exist for the surfaces where an extra field is not merely
// untidy but a disclosure: documents (storageKey), invitations (token),
// memberships and the anonymous public surface.
//
// A timestamp crosses the wire as an ISO string; the repositories hand back Date
// objects, so the schemas coerce rather than reject.
// `.meta()` describes what ends up on the wire: the transformation itself
// cannot be expressed in JSON Schema, but its result can. Without this, the
// OpenAPI document would say "anything" for a field that is always an
// ISO-8601 timestamp.
const isoDate = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value))
  .meta({ type: "string", format: "date-time" });

// Freeform jsonb stays freeform - but a JSON object is still something other
// than "anything": as `z.unknown()` every caller had to guess and then cast
// to reach a field.
const jsonObjectSchema = z.record(z.string(), z.unknown());

// A dictionary entry's display hints are not a freeform attachment but an
// agreed structure (grouping, order, presentation as a metric). The rest of
// the metadata stays open, hence `looseObject`: known fields are named,
// unknown ones travel along unharmed. On the anonymous surface, `metadata`
// does not appear at all.
const entryDisplayMetadataSchema = z.object({
  group: translatableStringSchema.optional(),
  groupId: z.string().optional(),
  order: z.number().optional(),
  presentation: z.literal("metric").optional(),
});
const dictionaryEntryMetadataSchema = z.looseObject({
  internalDisplay: entryDisplayMetadataSchema.optional(),
});

// and no client has any use for it - downloads go through the API, which issues
// a short-lived presigned URL after checking access.
export const documentResponseSchema = z.object({
  checksum: z.string(),
  contentType: z.string(),
  createdAt: isoDate,
  filename: z.string(),
  id: z.string(),
  isPublic: z.boolean(),
  size: z.number(),
});

// The presigned URL travels as a payload, not a redirect. A browser cannot
// attach an organization header to a plain link, so the UI fetches the URL
// via a request first and navigates only after that.
export const documentDownloadResponseSchema = z.object({
  expiresIn: z.number(),
  url: z.string(),
});

export const memberResponseSchema = z.object({
  createdAt: isoDate,
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: organizationRoleSchema,
  status: membershipStatusSchema,
  updatedAt: isoDate,
  userId: z.string(),
});
export const membersResponseSchema = z.array(memberResponseSchema);

// No `token`: a pending invitation's token is the credential that redeems it.
// Listing invitations must not hand every admin screen a set of working links.
export const invitationResponseSchema = z.object({
  createdAt: isoDate,
  email: z.string(),
  expiresAt: isoDate,
  id: z.string(),
  invitedByUserId: z.string(),
  role: organizationRoleSchema,
  status: invitationStatusSchema,
});
export const invitationsResponseSchema = z.array(invitationResponseSchema);

// The one place the token is returned on purpose: whoever just created the
// invitation needs the link to hand over, and without SMTP that is the only way
// it reaches the invitee.
export const createdInvitationResponseSchema = z.object({
  email: z.string(),
  id: z.string(),
  mailDelivered: z.boolean(),
  role: organizationRoleSchema,
  token: z.string(),
});

export const revokedInvitationResponseSchema = z.object({ id: z.string() });

export const acceptedInvitationResponseSchema = z.object({
  organizationId: z.string(),
  role: organizationRoleSchema,
});

export const organizationResponseSchema = z.object({
  createdAt: isoDate,
  id: z.string(),
  // `organizations.name` is `text not null` - `z.unknown()` neither described
  // nor held that here. A schema that says "anything" is not a boundary but a
  // gap with a type.
  name: z.string(),
  // Not optional: both the list and the create response answer with the
  // caller's role in this organization.
  role: organizationRoleSchema,
  slug: z.string(),
  updatedAt: isoDate,
});
export const organizationsResponseSchema = z.array(organizationResponseSchema);

// The anonymous surface. Everything here is readable by anyone, so what the
// schema omits matters more than what it names.
//
// Dictionary entries are stripped of internal display metadata today by
// stripInternalDictionaryMetadata - a function a caller has to remember. Naming
// the public fields instead makes forgetting impossible: an entry's internal
// grouping/sorting hints simply have no field to travel in.
export const publicDictionaryEntryResponseSchema = z.object({
  allowedValues: z.array(z.unknown()).nullish(),
  canonicalUri: z.string().nullish(),
  description: translatableStringSchema.nullish(),
  entryKey: z.string(),
  externalId: z.string().nullish(),
  id: z.string(),
  name: translatableStringSchema,
  repositoryId: z.string().nullish(),
  required: z.boolean(),
  standardReference: z.string().nullish(),
  unit: z.string().nullish(),
  validationRules: jsonObjectSchema.nullish(),
  // Same as on the tenant side: same entry, same allowed values. As
  // `z.string()` the public surface described a different truth than the
  // internal one - and a viewer rendering both had to give up the narrower one.
  valueType: dataValueTypeSchema,
  version: z.string().nullish(),
  visibility: visibilitySchema,
});

export const publicDictionaryRepositoryResponseSchema = z.object({
  id: z.string(),
  name: translatableStringSchema,
  namespaceUri: z.string(),
  publisher: z.string().nullish(),
  repositoryKey: z.string(),
  status: z.string(),
  version: z.string(),
});

// shapes as the passport payload - same anonymous audience, same omissions.
export const publicDictionaryResponseSchema = z.object({
  repository: publicDictionaryRepositoryResponseSchema,
});

export const publicDictionaryEntriesResponseSchema = z.object({
  entries: z.array(publicDictionaryEntryResponseSchema),
});

// Probe payloads. Typed like everything else so a readiness check cannot start
// reporting a connection string it picked up from an error object.
export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  timestamp: z.string(),
});

export const readinessResponseSchema = healthResponseSchema.extend({
  database: z.string(),
  storage: z.string(),
});

// tenant-internal, not the anonymous public projection above - so these keep
// every column the repository returns rather than stripping to a public subset.
//
// `identifiers` is one shape everywhere, sourced from the product_identifiers
// table.
export const productIdentifierResponseSchema = z.object({
  identifierType: productIdentifierTypeSchema,
  identifierValue: z.string(),
  issuer: z.string().nullish(),
});

export const productResponseSchema = z.object({
  category: z.string().nullish(),
  createdAt: isoDate,
  id: z.string(),
  identifiers: z.array(productIdentifierResponseSchema),
  lifecycleStatus: productLifecycleStatusSchema,
  manufacturerProductId: z.string().nullish(),
  metadata: jsonObjectSchema.nullish(),
  name: translatableStringSchema,
  // No organizationId: the caller is already scoped to one tenant by the
  // request header, so echoing it back says nothing they did not send.
  productId: z.string(),
  updatedAt: isoDate,
});
export const productsResponseSchema = z.array(productResponseSchema);

export const economicOperatorResponseSchema = z.object({
  address: jsonObjectSchema.nullish(),
  countryCode: z.string().nullish(),
  createdAt: isoDate,
  id: z.string(),
  legalName: z.string(),
  metadata: jsonObjectSchema.nullish(),
  operatorId: z.string(),
  // No organizationId: the caller named the tenant in the request header.
  roles: z.array(economicOperatorRoleSchema),
  updatedAt: isoDate,
  vatId: z.string().nullish(),
});
export const economicOperatorsResponseSchema = z.array(economicOperatorResponseSchema);

export const serviceAccountResponseSchema = z.object({
  createdAt: isoDate,
  id: z.string(),
  name: z.string(),
  // No `createdBy`: who created the account is in the audit log - in the list
  // it would be a user id with no purpose.
  role: organizationRoleSchema,
  scopes: z.array(apiScopeSchema),
  status: z.string(),
  updatedAt: isoDate,
});
export const serviceAccountsResponseSchema = z.array(serviceAccountResponseSchema);

// No `secretHash`, anywhere. The field does not exist in the response shape,
// so it cannot ride along by accident.
export const apiKeyResponseSchema = z.object({
  createdAt: isoDate,
  expiresAt: isoDate.nullish(),
  id: z.string(),
  keyPrefix: z.string(),
  label: z.string().nullish(),
  lastUsedAt: isoDate.nullish(),
  revokedAt: isoDate.nullish(),
  serviceAccountId: z.string(),
});
export const apiKeysResponseSchema = z.array(apiKeyResponseSchema);

// The one place the plaintext goes back - on creation and never again.
// Whoever loses it creates a new key and revokes the old one; that is exactly
// why an account can have several.
export const createdApiKeyResponseSchema = z.object({
  key: apiKeyResponseSchema,
  plaintext: z.string(),
});

// --- Connectors to external systems ---------------------------------------

export const connectorConfigFieldResponseSchema = z.object({
  description: z.string().optional(),
  key: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  // Controls both the input form and the storage location: secret fields are
  // encrypted into their own column and never come back out.
  secret: z.boolean(),
});

export const connectorResponseSchema = z.object({
  available: z.boolean(),
  // The host the module talks to, and whether that is still the one its
  // manifest names. A development override (a local mock) is visible in the UI
  // rather than only in the process environment: an import that looks exactly
  // like an import from the real system is a trap someone walks into once and
  // then doubts every number afterwards.
  baseUrl: z.string().nullable(),
  baseUrlOverridden: z.boolean(),
  capabilities: z.array(z.string()),
  config: z.record(z.string(), z.string()),
  configFields: z.array(connectorConfigFieldResponseSchema),
  description: z.string(),
  // Whether credentials are stored - not which ones. The UI needs exactly this
  // one fact to show "stored, leave blank to keep".
  hasCredentials: z.boolean(),
  installed: z.boolean(),
  key: z.string(),
  known: z.boolean(),
  name: z.string(),
  secretStorageAvailable: z.boolean(),
  status: z.string().nullable(),
  unavailableReason: z.string().nullable(),
  vendor: z.string(),
  version: z.string(),
});
export const connectorsResponseSchema = z.array(connectorResponseSchema);

// Installing and reconfiguring are the same operation. Values come in as a
// flat map because the fields come from the module's manifest, not from this
// schema - a fixed field pair here would mean every connector needed the same
// inputs.
export const installConnectorSchema = z.object({
  values: z.record(z.string(), z.string()).default({}),
});

export const connectorStatusSchema = z.object({
  status: z.enum(["active", "disabled"]),
});

export const connectorInstallationResponseSchema = z.object({
  key: z.string(),
  status: z.string(),
});

export const connectorConnectionResponseSchema = z.object({
  ok: z.literal(true),
});

export const connectorRemovalResponseSchema = z.object({
  key: z.string(),
});

// The preview of a product from the external system - nothing saved yet.
// `attributes` are the fields with no counterpart in the catalog: they are
// shown and carried along on import, but deliberately not modeled as data
// elements.
export const externalProductResponseSchema = z.object({
  attributes: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      unit: z.string().optional(),
      value: z.union([
        z.union([z.string(), z.number(), z.boolean(), z.null()]),
        z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
      ]),
    }),
  ),
  category: z.string().optional(),
  description: z.string().optional(),
  documents: z.array(
    z.object({
      externalId: z.string(),
      mimeType: z.string().optional(),
      name: z.string(),
      sizeBytes: z.number().optional(),
    }),
  ),
  externalId: z.string(),
  identifiers: z.array(
    z.object({
      issuer: z.string().optional(),
      type: productIdentifierTypeSchema,
      value: z.string(),
    }),
  ),
  manufacturer: z
    .object({
      address: z
        .object({
          buildingNumber: z.string().optional(),
          city: z.string().optional(),
          countryCode: z.string().optional(),
          postalCode: z.string().optional(),
          region: z.string().optional(),
          street: z.string().optional(),
        })
        .optional(),
      externalId: z.string(),
      legalName: z.string(),
      roles: z.array(economicOperatorRoleSchema),
    })
    .optional(),
  name: z.string(),
  // The record kind, as the source system tracks it. This is the key the field
  // mapping hangs on.
  sourceType: z.object({ key: z.string(), label: z.string() }).optional(),
  updatedAt: z.string().optional(),
});

// --- Field mapping ----------------------------------------------------------
//
// Where a field from the external system belongs. The decision is made once
// per record kind and then applies to every record of that kind - so it is
// seen on the object but remembered on the kind.

export const connectorFieldTargetSchema = z.enum(["ignore", "attribute", "element"]);

export const connectorFieldDecisionSchema = z.object({
  // The collection the element sits under in the passport - the "group
  // heading". Without it, it sits at the top level.
  collectionElementId: z.string().min(1).optional(),
  collectionName: z.string().min(1).optional(),
  // The dictionary entry that gives the field its business meaning. Without
  // it, the field cannot become a data element.
  dictionaryReference: z.string().min(1).optional(),
  elementId: z.string().min(1).optional(),
  sourceField: z.string().min(1),
  target: connectorFieldTargetSchema,
  unit: z.string().min(1).optional(),
  visibility: visibilitySchema,
});

// The most likely dictionary entry for a still-undecided field. It is
// **never** applied on its own: a suggestion is a guess from name similarity,
// and a guess that enters itself is exactly the fabrication of passport
// content the intermediate step is meant to prevent.
export const connectorSuggestionResponseSchema = z.object({
  categoryId: z.string().optional(),
  categoryLabel: z.string().optional(),
  // Between 0 and 1. It is in the response so a caller can decide for
  // themselves when to trust it.
  confidence: z.number(),
  dictionaryReference: z.string(),
  label: z.string(),
  // Which dictionary the entry sits in. Without it "this already exists" is a
  // statement about the tenant rather than about a target: the draft wizard
  // would leave a field out of a *new* dictionary because some other
  // dictionary describes it.
  repositoryKey: z.string(),
  unit: z.string().optional(),
  visibility: visibilitySchema,
});

export const connectorMappedFieldResponseSchema = connectorFieldDecisionSchema.extend({
  // Whether this field has already been decided once. The UI highlights the
  // new ones - those are the ones someone has to look at.
  configured: z.boolean(),
  label: z.string(),
  suggestion: connectorSuggestionResponseSchema.nullish(),
  // A list stays a list: it becomes a multi-valued data element.
  value: z.union([
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
    z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  ]),
});

export const connectorMappingResponseSchema = z.object({
  fields: z.array(connectorMappedFieldResponseSchema),
  sourceType: z.object({ key: z.string(), label: z.string() }),
});

export const connectorMappingProfileResponseSchema = z.object({
  fields: z.array(connectorFieldDecisionSchema),
  sourceType: z.string(),
});

export const saveConnectorMappingSchema = z.object({
  fields: z.array(connectorFieldDecisionSchema),
  sourceType: z.string().default(""),
});

// --- A dictionary drafted from a record kind --------------------------------
//
// The mapping asks which dictionary entry a field follows. On the first import
// of a record kind there is nothing to ask about: the dictionary is empty, and
// every field falls back to a provenance attribute. The draft is the way out of
// that - the source system's own field schema, read as a vocabulary proposal.
//
// It stays a proposal. Nothing in this response has been written; what gets
// confirmed is a dictionary, and whether a passport carries the field is still
// the mapping's decision afterwards.

const connectorScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const connectorDictionaryDraftEntrySchema = z.object({
  allowedValues: z.array(connectorScalarSchema).nullish(),
  description: z.string().nullish(),
  entryKey: z.string().min(1),
  // What the dictionary already holds for this field. It is the reason not to
  // create the entry, and it is reported rather than filtered out: a second
  // entry for a field that is already described is how one vocabulary becomes
  // two.
  existing: z
    .object({
      confidence: z.number(),
      dictionaryReference: z.string(),
      label: z.string(),
      // The dictionary the entry was found in - which need not be the one the
      // entries are about to be written to.
      repositoryKey: z.string(),
    })
    .nullish(),
  // Whether the value type is what the source system states or what the platform
  // read off a single value. A guess that says so can be corrected.
  inferredValueType: z.boolean(),
  name: z.string().min(1),
  sourceField: z.string().min(1),
  unit: z.string().nullish(),
  valueType: dataValueTypeSchema,
  visibility: visibilitySchema,
});

export const connectorDictionaryDraftSchema = z.object({
  entries: z.array(connectorDictionaryDraftEntrySchema),
  repository: z.object({
    name: z.string(),
    namespaceUri: z.string(),
    repositoryKey: z.string(),
    version: z.string(),
  }),
});

export const connectorPreviewResponseSchema = z.object({
  // A proposal for the dictionary this record kind would need - travelling with
  // the preview because it is derived from the same plan, and a second route for
  // it would mean a second call into the external system.
  dictionaryDraft: connectorDictionaryDraftSchema,
  mapping: connectorMappingResponseSchema,
  product: externalProductResponseSchema,
});

export const createConnectorDictionarySchema = z.object({
  // Where the new entries are filed. Optional, and only a category the target
  // dictionary already declares: this catalogue groups entries by subject, and
  // an import that invents a heading from the source system's record kind sorts
  // the vocabulary by the wrong axis. Without one they land in "Default".
  category: z.object({ id: z.string().min(1), label: z.string().min(1) }).nullish(),
  entries: z
    .array(
      connectorDictionaryDraftEntrySchema
        .omit({ existing: true, inferredValueType: true })
        .extend({ required: z.boolean().default(false) }),
    )
    .min(1),
  // The record kind the entries were drafted from. It becomes the entries'
  // parent category - the grouping that later turns into one collection in the
  // passport.
  sourceType: z.object({ key: z.string(), label: z.string().min(1) }),
  target: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("new"),
      name: z.string().min(1),
      namespaceUri: z.url(),
      repositoryKey: z.string().min(1),
      version: z.string().min(1),
    }),
    z.object({ mode: z.literal("existing"), repositoryKey: z.string().min(1) }),
  ]),
});

// What one entry means for the mapping: the reference to point at and the
// collection the element belongs in. The collection comes from the entry that
// exists, not from what the request proposed - deriving it a second time in the
// client would mean two copies of one naming rule, and for a pre-existing entry
// the client's copy would be wrong.
const connectorDictionaryPlacementSchema = z.object({
  collection: z.object({ id: z.string(), label: z.string() }).nullable(),
  dictionaryReference: z.string(),
  entryKey: z.string(),
  sourceField: z.string(),
});

export const connectorDictionaryResponseSchema = z.object({
  // Per source field, the reference the mapping can point at from now on. The
  // caller does not have to look up what it just created to use it.
  created: z.array(connectorDictionaryPlacementSchema),
  // Entries the dictionary already held under that key. Not an error and not a
  // dead end: the name someone already used is the answer, so these carry the
  // existing entry's reference and are just as usable for the mapping.
  existing: z.array(connectorDictionaryPlacementSchema),
  repositoryKey: z.string(),
  repositoryVersion: z.string(),
});

export const importExternalProductSchema = z.object({
  // The fields a passport needs that the external system does not carry.
  // If missing, only the catalog entry is created.
  dpp: z
    .object({
      dppSchemaVersion: z.string().min(1),
      economicOperatorId: z.string().min(1),
      facilityId: z.string().min(1).optional(),
      granularity: z.string().min(1),
    })
    .optional(),
  externalId: z.string().min(1),
  fields: z.array(connectorFieldDecisionSchema).optional(),
  // Defaults to on: otherwise the same mapping would have to be repeated on
  // every import, which is exactly what the profile is meant to save.
  saveMapping: z.boolean().default(true),
});

export const importedProductResponseSchema = z.object({
  // Whether a catalog entry was created or an existing one refreshed. The
  // difference belongs in the response: it decides what the UI says next.
  created: z.boolean(),
  // The created passport, if one was requested.
  dpp: z.object({ digitalProductPassportId: z.string(), publicId: z.string() }).nullish(),
  // What the passport failed on, if one was requested and did not come to be.
  // The catalog entry stays regardless - it is correct on its own.
  dppError: z.object({ code: z.string(), message: z.string() }).nullish(),
  identifiers: z.array(productIdentifierResponseSchema),
  name: translatableStringSchema,
  productId: z.string(),
  // Documents that did not make it into the passport, with the reason. An
  // import that silently drops half the documents has done more damage than
  // one that fetched nothing at all.
  skippedDocuments: z.array(z.object({ name: z.string(), reason: z.string() })).default([]),
});

// The export carries passports in the norm shape (`dppSnapshotSchema`) plus
// the short public id they are reachable under. A timestamp too, because an
// export without a record of when it was made is worthless as a backup.
export const dppExportResponseSchema = z.object({
  dpps: z.array(z.object({ dpp: dppSnapshotSchema, publicId: z.string() })),
  exportedAt: isoDate,
  total: z.number(),
});

const metricContributionSchema = z.object({
  mass: z.number().optional(),
  publicId: z.string(),
  raw: z.unknown(),
  // `null` where the datapoint is not a number (aggregation kind `presence`):
  // the raw value stands next to it - a number made from it would be invented.
  value: z.number().nullable(),
  versionLabel: z.string(),
});

export const sustainabilityMetricResponseSchema = z.object({
  // The evidence: which passport, which version, which raw value. Without it
  // the metric would be a claim.
  contributions: z.array(metricContributionSchema),
  coverage: z.object({ total: z.number(), withValue: z.number() }),
  definition: z.object({
    aggregation: z.enum(["distribution", "mass-weighted-share", "presence"]),
    description: z.string(),
    key: z.string(),
    label: z.string(),
    standard: z.enum(["E1", "E2", "E3", "E4", "E5"]),
    unit: z.string(),
  }),
  distribution: z.object({ max: z.number(), median: z.number(), min: z.number() }).nullable(),
  unparsable: z.array(z.object({ publicId: z.string(), raw: z.unknown() })),
  // `null` **with** a reason where an aggregation cannot be substantiated.
  // A plausible number without grounding would otherwise land in an audited
  // report.
  weightedAverage: z.number().nullable(),
  weightedAverageOmittedBecause: z.string().nullable(),
});

export const sustainabilityReportResponseSchema = z.object({
  asOf: isoDate,
  consideredDpps: z.number(),
  metrics: z.array(sustainabilityMetricResponseSchema),
  scopeNote: z.string(),
});

export const facilityResponseSchema = z.object({
  address: jsonObjectSchema.nullish(),
  countryCode: z.string().nullish(),
  createdAt: isoDate,
  facilityId: z.string(),
  facilityType: facilityTypeSchema,
  id: z.string(),
  metadata: jsonObjectSchema.nullish(),
  name: z.string(),
  operatorId: z.string().nullish(),
  // No organizationId: the caller named the tenant in the request header.
  updatedAt: isoDate,
});
export const facilitiesResponseSchema = z.array(facilityResponseSchema);

export const dataDictionaryRepositoryResponseSchema = z.object({
  createdAt: isoDate,
  id: z.string(),
  metadata: jsonObjectSchema.nullish(),
  name: translatableStringSchema,
  namespaceUri: z.string(),
  // No organizationId: the caller named the tenant in the request header.
  publisher: z.string().nullish(),
  repositoryKey: z.string(),
  status: z.enum(["draft", "active", "retired"]),
  updatedAt: isoDate,
  version: z.string(),
});
export const dataDictionaryRepositoriesResponseSchema = z.array(
  dataDictionaryRepositoryResponseSchema,
);

// Unlike publicDictionaryEntryResponseSchema, this is the tenant-side view: it
// keeps organizationId/repositoryId/metadata/timestamps, none of which the
// anonymous surface may see.
export const dataDictionaryEntryResponseSchema = z.object({
  allowedValues: z.array(z.unknown()).nullish(),
  canonicalUri: z.string().nullish(),
  createdAt: isoDate,
  description: translatableStringSchema.nullish(),
  entryKey: z.string(),
  externalId: z.string().nullish(),
  id: z.string(),
  metadata: dictionaryEntryMetadataSchema.nullish(),
  name: translatableStringSchema,
  // No organizationId: the caller named the tenant in the request header.
  repositoryId: z.string().nullish(),
  required: z.boolean(),
  standardReference: z.string().nullish(),
  unit: z.string().nullish(),
  updatedAt: isoDate,
  validationRules: jsonObjectSchema.nullish(),
  valueType: dataValueTypeSchema,
  version: z.string().nullish(),
  visibility: visibilitySchema,
});
export const dataDictionaryEntriesResponseSchema = z.array(dataDictionaryEntryResponseSchema);

// --- DPP (organization-authenticated) response schemas ---------------------
//
// Unlike the public surface above, the caller here is already inside the
// tenant, so an internal id is not a disclosure. What these schemas guard
// against instead is jsonb riding through unreshaped: `patch` and
// `changedProperties` are formless by nature and therefore stay `z.unknown()`.
// A name is not: it is a translation object, enforced by the create schema;
// treating it as "anything" would not describe the boundary, only impose a
// cast on every caller.

export const dppListItemResponseSchema = z.object({
  digitalProductPassportId: z.string(),
  publicId: z.string(),
  versionLabel: z.string(),
  // Null via the LEFT JOIN on active_version_id when no version has ever been
  // published - distinct from versionLabel, which names the open revision.
  publishedVersionLabel: z.string().nullish(),
  dppSchemaVersion: z.string(),
  economicOperatorId: z.string(),
  facilityId: z.string().nullish(),
  granularity: z.string(),
  lastUpdate: isoDate,
  productId: z.string(),
  status: dppStatusSchema,
  updatedAt: isoDate,
});

export const dppListResponseSchema = z.object({
  dpps: z.array(dppListItemResponseSchema),
  statusCounts: z.object({
    archived: z.number(),
    draft: z.number(),
    published: z.number(),
    review: z.number(),
  }),
  total: z.number(),
});

// prEN 18222 4.5 ReadDPPIdsByProductIds.
export const dppIdsByProductsResponseSchema = z.object({
  ids: z.array(z.string()),
  nextCursor: z.string().nullable(),
});

// { dpp, publicId } un-keyed on purpose: the snapshot keeps the norm shape, and
// the public id rides alongside it so the client can link to the new DPP under
// its short URL right away.
export const createDppResponseSchema = z.object({
  dpp: dppSnapshotSchema,
  publicId: z.string(),
});

// Not dataDictionaryEntryResponseSchema/dataDictionaryRepositoryResponseSchema
// above: those require createdAt/updatedAt, but the in-memory demo tenant (no
// database row behind it) omits both entirely, and the view endpoint serves
// both tenants through the same schema.
const dictionaryEntryViewResponseSchema = z.object({
  id: z.string(),
  // No organizationId: the caller named the tenant in the request header.
  repositoryId: z.string().nullish(),
  entryKey: z.string(),
  externalId: z.string().nullish(),
  canonicalUri: z.string().nullish(),
  version: z.string().nullish(),
  name: translatableStringSchema,
  description: translatableStringSchema.nullish(),
  valueType: dataValueTypeSchema,
  unit: z.string().nullish(),
  required: z.boolean(),
  visibility: visibilitySchema,
  standardReference: z.string().nullish(),
  allowedValues: z.array(z.unknown()).nullish(),
  validationRules: jsonObjectSchema.nullish(),
  metadata: dictionaryEntryMetadataSchema.nullish(),
  // Absent (not merely null) on the in-memory demo tenant, which has no table
  // row to carry these.
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

const dictionaryRepositoryViewResponseSchema = z.object({
  id: z.string(),
  // No organizationId: the caller named the tenant in the request header.
  repositoryKey: z.string(),
  name: translatableStringSchema,
  namespaceUri: z.string(),
  version: z.string(),
  publisher: z.string().nullish(),
  status: z.string(),
  metadata: jsonObjectSchema.nullish(),
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

// A relationship as returned to an organization member. Unlike the public
// surface's relationship shape, this omits only the join-table plumbing
// (organizationId, sourceDppId, targetDppId) - internal ids the caller has no
// use for, not a security boundary.
export const dppRelationshipResponseSchema = z.object({
  id: z.string(),
  relationshipType: dppRelationshipTypeSchema,
  visibility: visibilitySchema,
  // Which direction the edge runs in from the queried passport. Without this,
  // a client would read an incoming edge as outgoing - the type would be at
  // the wrong end and the reference would point back at the passport the
  // query started from.
  direction: z.enum(["incoming", "outgoing"]).default("outgoing"),
  sourceDigitalProductPassportId: z.string().nullish(),
  sourceProductId: z.string().nullish(),
  // The short identifier of the respective end, if there is a passport for it
  // in this tenant. A target may be a bare URN - then it is absent.
  sourcePublicId: z.string().nullish(),
  targetPublicId: z.string().nullish(),
  targetDigitalProductPassportId: z.string(),
  targetProductId: z.string().nullish(),
  validFrom: isoDate,
  validTo: isoDate.nullish(),
  metadata: z.unknown().nullish(),
});
export const dppRelationshipsResponseSchema = z.array(dppRelationshipResponseSchema);

export const dppViewResponseSchema = z.object({
  dictionaryEntries: z.array(dictionaryEntryViewResponseSchema),
  dictionaryRepositories: z.array(dictionaryRepositoryViewResponseSchema),
  dpp: dppSnapshotSchema,
  publicId: z.string(),
  versionLabel: z.string(),
  publishedVersionLabel: z.string().optional(),
  relationships: dppRelationshipsResponseSchema,
  hasPublicVersion: z.boolean(),
});

const dppVersionSummaryResponseSchema = z.object({
  versionNumber: z.number(),
  versionLabel: z.string(),
  status: dppStatusSchema,
  createdBy: z.string(),
  createdAt: isoDate,
});
export const dppVersionsResponseSchema = z.array(dppVersionSummaryResponseSchema);

// Like `dppVersionDetailResponseSchema`, plus the label: whoever asks for the
// state as of a date wants to know *which* version they got.
export const dppVersionAtDateResponseSchema = z.object({
  createdAt: isoDate,
  snapshot: dppSnapshotSchema,
  status: dppStatusSchema,
  versionLabel: z.string(),
  versionNumber: z.number(),
});

export const deletedDppResponseSchema = z.object({
  digitalProductPassportId: z.string(),
});

export const dppVersionDetailResponseSchema = z.object({
  versionNumber: z.number(),
  status: dppStatusSchema,
  createdBy: z.string(),
  createdAt: isoDate,
  snapshot: dppSnapshotSchema,
});

const dppAuditEventResponseSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  actorUserId: z.string(),
  objectType: z.string(),
  objectId: z.string(),
  changedProperties: z.unknown().nullish(),
  patch: z.unknown().nullish(),
  createdAt: isoDate,
});
export const dppAuditResponseSchema = z.array(dppAuditEventResponseSchema);

const dppFieldDiffResponseSchema = z.object({
  path: z.string(),
  label: z.string(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  kind: z.enum(["added", "removed", "changed"]),
});

const dppTimelineEntryResponseSchema = z.object({
  id: z.string(),
  at: isoDate,
  actor: z.string(),
  kind: z.enum(["created", "updated", "status", "relationship-added", "relationship-removed"]),
  status: dppStatusSchema,
  statusFrom: dppStatusSchema.optional(),
  statusTo: dppStatusSchema.optional(),
  fieldDiffs: z.array(dppFieldDiffResponseSchema),
});
export const dppTimelineResponseSchema = z.array(dppTimelineEntryResponseSchema);

const dppValidationIssueResponseSchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
  severity: z.enum(["error", "warning"]),
});
export const dppValidationReportResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(dppValidationIssueResponseSchema),
  warnings: z.array(dppValidationIssueResponseSchema),
});

export const publicDppResponseSchema = z.object({
  dictionaryEntries: z.array(publicDictionaryEntryResponseSchema),
  dictionaryRepositories: z.array(publicDictionaryRepositoryResponseSchema),
  dpp: dppSnapshotSchema,
  profile: z.object({
    dictionary: z.string().optional(),
    dictionaryVersion: z.string().optional(),
    schemaVersion: z.string(),
  }),
  // The short handle the passport is routed under; the URN stays inside dpp.
  publicId: z.string(),
  relationships: z.array(
    z.object({
      // The public projection shows only **outgoing** edges
      // (listPublicOutgoingDppRelationships). The direction is still included:
      // it is part of the statement, and a reader should not have to infer it
      // from the endpoint name.
      direction: z.literal("outgoing").default("outgoing"),
      id: z.string(),
      relationshipType: dppRelationshipTypeSchema,
      targetDigitalProductPassportId: z.string(),
      targetProductId: z.string().nullish(),
      validFrom: z
        .union([z.string(), z.date()])
        .transform((value) => (value instanceof Date ? value.toISOString() : value)),
      visibility: visibilitySchema,
    }),
  ),
});

// --- Derived types -----------------------------------------------------------
//
// The response schemas are the boundary; the types below fall out of them. A
// hand-maintained copy would not reveal it had gone stale - it would keep
// compiling while describing an API that no longer exists.
//
// The frontend import is `import type` - nothing from Zod ends up in the
// client bundle.

export type DppStatus = z.infer<typeof dppStatusSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type Visibility = z.infer<typeof visibilitySchema>;
export type DataValueType = z.infer<typeof dataValueTypeSchema>;
export type DppRelationshipType = z.infer<typeof dppRelationshipTypeSchema>;
export type ProductLifecycleStatus = z.infer<typeof productLifecycleStatusSchema>;
export type ProductIdentifierType = z.infer<typeof productIdentifierTypeSchema>;
export type EconomicOperatorRole = z.infer<typeof economicOperatorRoleSchema>;
export type TranslatableString = z.infer<typeof translatableStringSchema>;
export type EntryDisplayMetadata = z.infer<typeof entryDisplayMetadataSchema>;
export type ElementPolicy = z.infer<typeof elementPolicySchema>;
export type DataElement = z.infer<typeof dataElementSchema>;
export type DataElementCollection = z.infer<typeof dataElementCollectionSchema>;
export type DppSnapshot = z.infer<typeof dppSnapshotSchema>;

export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type DocumentDownloadResponse = z.infer<typeof documentDownloadResponseSchema>;
export type MemberResponse = z.infer<typeof memberResponseSchema>;
export type InvitationResponse = z.infer<typeof invitationResponseSchema>;
export type CreatedInvitationResponse = z.infer<typeof createdInvitationResponseSchema>;
export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type EconomicOperatorResponse = z.infer<typeof economicOperatorResponseSchema>;
export type FacilityResponse = z.infer<typeof facilityResponseSchema>;
export type DictionaryUpgradeResponse = z.infer<typeof dictionaryUpgradeResponseSchema>;
export type EsrsProfilesResponse = z.infer<typeof esrsProfilesResponseSchema>;
export type EsrsProfileApplicationResponse = z.infer<typeof esrsProfileApplicationResponseSchema>;
export type ApiScope = z.infer<typeof apiScopeSchema>;
export type CreateServiceAccountInput = z.infer<typeof createServiceAccountSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type DppImportInput = z.infer<typeof dppImportSchema>;
export type DppImportReport = z.infer<typeof dppImportReportSchema>;
export type ServiceAccountResponse = z.infer<typeof serviceAccountResponseSchema>;
export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;
export type ConnectorResponse = z.infer<typeof connectorResponseSchema>;
export type ConnectorConfigFieldResponse = z.infer<typeof connectorConfigFieldResponseSchema>;
export type ExternalProductResponse = z.infer<typeof externalProductResponseSchema>;
export type ConnectorFieldTarget = z.infer<typeof connectorFieldTargetSchema>;
export type ConnectorFieldDecision = z.infer<typeof connectorFieldDecisionSchema>;
export type ConnectorMappedField = z.infer<typeof connectorMappedFieldResponseSchema>;
export type ConnectorMappingResponse = z.infer<typeof connectorMappingResponseSchema>;
export type ConnectorPreviewResponse = z.infer<typeof connectorPreviewResponseSchema>;
export type ConnectorDictionaryDraft = z.infer<typeof connectorDictionaryDraftSchema>;
export type ConnectorDictionaryDraftEntry = z.infer<typeof connectorDictionaryDraftEntrySchema>;
export type ConnectorDictionaryResponse = z.infer<typeof connectorDictionaryResponseSchema>;
export type CreateConnectorDictionaryInput = z.infer<typeof createConnectorDictionarySchema>;
export type ImportedProductResponse = z.infer<typeof importedProductResponseSchema>;
export type InstallConnectorInput = z.infer<typeof installConnectorSchema>;
export type FacilityType = z.infer<typeof facilityTypeSchema>;
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type PatchFacilityInput = z.infer<typeof patchFacilitySchema>;
export type DataDictionaryRepositoryResponse = z.infer<
  typeof dataDictionaryRepositoryResponseSchema
>;
export type DataDictionaryEntryResponse = z.infer<typeof dataDictionaryEntryResponseSchema>;

export type DppListItemResponse = z.infer<typeof dppListItemResponseSchema>;
export type DppListResponse = z.infer<typeof dppListResponseSchema>;
export type DppRelationshipResponse = z.infer<typeof dppRelationshipResponseSchema>;
export type DppViewResponse = z.infer<typeof dppViewResponseSchema>;
export type CreateDppResponse = z.infer<typeof createDppResponseSchema>;
// The element schemas of these lists are deliberately not exported - an
// entry's type derives from the list, so there is only one source of truth.
export type DppVersionResponse = z.infer<typeof dppVersionsResponseSchema>[number];
export type DppVersionDetailResponse = z.infer<typeof dppVersionDetailResponseSchema>;
export type DppAuditEventResponse = z.infer<typeof dppAuditResponseSchema>[number];
export type DppTimelineEntryResponse = z.infer<typeof dppTimelineResponseSchema>[number];
export type DppFieldDiffResponse = DppTimelineEntryResponse["fieldDiffs"][number];
export type DppValidationReportResponse = z.infer<typeof dppValidationReportResponseSchema>;
export type DppValidationIssueResponse = DppValidationReportResponse["errors"][number];

export type PublicDppResponse = z.infer<typeof publicDppResponseSchema>;
export type PublicDictionaryEntryResponse = z.infer<typeof publicDictionaryEntryResponseSchema>;
export type PublicDictionaryRepositoryResponse = z.infer<
  typeof publicDictionaryRepositoryResponseSchema
>;

// The query schemas describe what a caller *may* send - the input type, not
// the output type: `limit` is optional when sent and only set after parsing.
export type DppListQueryInput = z.input<typeof dppListQuerySchema>;
