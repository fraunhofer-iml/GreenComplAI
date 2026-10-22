import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const dppStatus = pgEnum("dpp_status", ["draft", "review", "published", "archived"]);
export const dppRelationshipType = pgEnum("dpp_relationship_type", [
  "contains",
  "isComponentOf",
  "replaces",
  "isVariantOf",
  "derivedFrom",
  "hasPackaging",
  "hasSparePart",
]);
export const visibilityLevel = pgEnum("visibility_level", ["public", "controlled"]);
export const productLifecycleStatus = pgEnum("product_lifecycle_status", [
  "concept",
  "active",
  "endOfLife",
  "recalled",
]);
export const productIdentifierType = pgEnum("product_identifier_type", [
  "gtin",
  "serialNumber",
  "batch",
  "model",
  "sku",
  "other",
]);
export const economicOperatorRole = pgEnum("economic_operator_role", [
  "manufacturer",
  "importer",
  "distributor",
  "authorizedRepresentative",
  "serviceProvider",
  "recycler",
  "authority",
]);
export const dataValueType = pgEnum("data_value_type", [
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
export const repositoryStatus = pgEnum("repository_status", ["draft", "active", "retired"]);
export const organizationRole = pgEnum("organization_role", [
  "admin",
  "editor",
  "viewer",
  "authority",
]);
export const membershipStatus = pgEnum("membership_status", ["invited", "active", "disabled"]);
export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked"]);
export const organizationStatus = pgEnum("organization_status", ["active", "suspended", "deleted"]);
export const schemaDefinitionStatus = pgEnum("schema_definition_status", [
  "draft",
  "active",
  "retired",
]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Set by Better Auth's twoFactor plugin once enrolment is verified .
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("user_email_idx").on(table.email),
  }),
);

// TOTP enrolment per user, owned by Better Auth's twoFactor plugin. `secret` and
// `backupCodes` are credentials: the plugin marks them as never returned, and
// nothing in this codebase selects them.
export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("two_factor_user_id_idx").on(table.userId),
    secretIdx: index("two_factor_secret_idx").on(table.secret),
  }),
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    tokenIdx: uniqueIndex("session_token_idx").on(table.token),
    userIdIdx: index("session_user_id_idx").on(table.userId),
  }),
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
    userIdIdx: index("account_user_id_idx").on(table.userId),
  }),
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }),
);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: organizationStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: organizationRole("role").notNull(),
    status: membershipStatus("status").notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationUserIdx: uniqueIndex("organization_memberships_org_user_idx").on(
      table.organizationId,
      table.userId,
    ),
  }),
);

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: organizationRole("role").notNull(),
    token: text("token").notNull().unique(),
    status: invitationStatus("status").notNull().default("pending"),
    invitedByUserId: text("invited_by_user_id").notNull(),
    acceptedByUserId: text("accepted_by_user_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("organization_invitations_token_idx").on(table.token),
    orgEmailIdx: index("organization_invitations_org_email_idx").on(
      table.organizationId,
      table.email,
    ),
  }),
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    name: jsonb("name").notNull(),
    category: text("category"),
    manufacturerProductId: text("manufacturer_product_id"),
    lifecycleStatus: productLifecycleStatus("lifecycle_status").notNull().default("active"),
    // No `identifiers` column: the identifiers of a product live in
    // product_identifiers. It used to be stored in both places at once, written
    // by the same call and never reconciled — and the two copies disagreed about
    // their own shape (a type->value map here, rows there), so `identifiers`
    // meant something different depending on which endpoint answered.
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: uniqueIndex("products_org_product_id_idx").on(
      table.organizationId,
      table.productId,
    ),
    categoryIdx: index("products_org_category_idx").on(table.organizationId, table.category),
    lifecycleStatusIdx: index("products_lifecycle_status_idx").on(table.lifecycleStatus),
  }),
);

export const productIdentifiers = pgTable(
  "product_identifiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    identifierType: productIdentifierType("identifier_type").notNull(),
    identifierValue: text("identifier_value").notNull(),
    issuer: text("issuer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdentifierIdx: uniqueIndex("product_identifiers_product_type_value_idx").on(
      table.productId,
      table.identifierType,
      table.identifierValue,
    ),
    identifierLookupIdx: index("product_identifiers_type_value_idx").on(
      table.identifierType,
      table.identifierValue,
    ),
  }),
);

// What happens at a facility. The list stays deliberately short and is not a
// classification system: it should make a facility findable, not describe its
// processes.
export const facilityType = pgEnum("facility_type", [
  "manufacturing",
  "assembly",
  "testing",
  "warehouse",
  "recycling",
  "repair",
  "other",
]);

// An operating facility of the tenant. A facility row gives `dpps.facility_id`
// a real referent instead of free text, so two spellings of the same plant
// cannot become two different facilities.
export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Business key as carried by the passport (plant number, GLN).
    facilityId: text("facility_id").notNull(),
    name: text("name").notNull(),
    facilityType: facilityType("facility_type").notNull().default("manufacturing"),
    // Business key of the operating economic operator, in the same form the
    // passport uses. Resolved on write .
    operatorId: text("operator_id"),
    countryCode: text("country_code"),
    address: jsonb("address"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    facilityIdIdx: uniqueIndex("facilities_org_facility_id_idx").on(
      table.organizationId,
      table.facilityId,
    ),
    nameIdx: index("facilities_name_idx").on(table.name),
  }),
);

export const economicOperators = pgTable(
  "economic_operators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    operatorId: text("operator_id").notNull(),
    legalName: text("legal_name").notNull(),
    roles: jsonb("roles").notNull(),
    countryCode: text("country_code"),
    vatId: text("vat_id"),
    address: jsonb("address"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operatorIdIdx: uniqueIndex("economic_operators_org_operator_id_idx").on(
      table.organizationId,
      table.operatorId,
    ),
    legalNameIdx: index("economic_operators_legal_name_idx").on(table.legalName),
  }),
);

// What a key may do - deliberately coarse. Two levels cover what an external
// system needs: read or maintain. A scope per endpoint would be a second
// permission language alongside roles, one that would eventually diverge from
// it.
export const apiScope = pgEnum("api_scope", ["read", "write"]);

// A technical credential for an external system (ERP, PLM, PIM, MES). Like a
// member, it is an actor of the organization and therefore carries the same
// role - a separate permission hierarchy would mean two answers to "who is
// allowed to do this".
export const serviceAccounts = pgTable(
  "service_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: organizationRole("role").notNull().default("viewer"),
    scopes: jsonb("scopes").notNull(),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgNameIdx: uniqueIndex("service_accounts_org_name_idx").on(table.organizationId, table.name),
  }),
);

// Credentials of a service account. Multiple keys per account are the point,
// not the exception: this is how rotation without downtime works - create a
// new key, roll it out, revoke the old one.
//
// Only the **hash** of the secret is stored. Reading the database does not
// yield a working key; the plaintext exists exactly once, in the creation
// response. `keyPrefix` is the public part used for lookup - otherwise every
// call would have to check every hash.
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceAccountId: uuid("service_account_id")
      .notNull()
      .references(() => serviceAccounts.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    keyPrefix: text("key_prefix").notNull().unique(),
    secretHash: text("secret_hash").notNull(),
    // Freely chosen label so that "which key am I revoking" is an answerable
    // question.
    label: text("label"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // Only the day, not the time: it should answer whether a key is still in
    // use - not when an external system runs its nightly jobs.
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index("api_keys_service_account_idx").on(table.serviceAccountId),
  }),
);

export const dpps = pgTable(
  "dpps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    digitalProductPassportId: text("digital_product_passport_id").notNull(),
    // Short, URL-safe handle used in web routes and QR targets. Purely a
    // presentation key: the canonical, norm-mandated identifier stays the URN in
    // digitalProductPassportId. The two spaces are disjoint by construction (a
    // URN always contains ':', the Base58 alphabet never does), so a lookup may
    // accept either without ambiguity.
    publicId: text("public_id").notNull(),
    // Display label of the currently open revision ("2026.2"). Independent of
    // dppSchemaVersion, which binds the DPP to a dictionary version. The integer
    // dppVersions.versionNumber stays the internal ordering.
    versionLabel: text("version_label").notNull(),
    productId: text("product_id").notNull(),
    granularity: text("granularity").notNull(),
    dppSchemaVersion: text("dpp_schema_version").notNull(),
    status: dppStatus("status").notNull().default("draft"),
    lastUpdate: timestamp("last_update", { withTimezone: true }).notNull().defaultNow(),
    economicOperatorId: text("economic_operator_id").notNull(),
    facilityId: text("facility_id"),
    activeVersionId: uuid("active_version_id"),
    currentSnapshot: jsonb("current_snapshot").notNull(),
    publicProjection: jsonb("public_projection"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // The DPP identifier (a URN) is the canonical, globally unique handle for a
    // passport and the deterministic public-resolver key. Global uniqueness
    // (not merely per-organization) rejects cross-tenant id collisions at write
    // time (prEN 18222 / ).
    dppIdIdx: uniqueIndex("dpps_dpp_id_idx").on(table.digitalProductPassportId),
    publicIdIdx: uniqueIndex("dpps_public_id_idx").on(table.publicId),
    orgProductIdIdx: index("dpps_org_product_id_idx").on(table.organizationId, table.productId),
    statusIdx: index("dpps_status_idx").on(table.status),
  }),
);

// `dpp_products` and `dpp_economic_operators` (two join tables from the
// original schema, unused since day one) were dropped in migration 0012: they
// would have stored the same fact a third time, next to the snapshot jsonb and
// the denormalized `dpps.product_id`/`dpps.economic_operator_id` columns - the
// same drift-prone pattern removed for product identifiers. The norm's
// multi-actor model (manufacturer, importer, distributor with roles and
// validity periods) returns with , shaped to what it actually needs there.

export const dppVersions = pgTable(
  "dpp_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dppId: uuid("dpp_id")
      .notNull()
      .references(() => dpps.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    // The revision label this snapshot belonged to. A version row is written on
    // every save, so many rows share one label — the label identifies the
    // revision, the number identifies the snapshot within the DPP's history.
    versionLabel: text("version_label").notNull(),
    status: dppStatus("status").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dppVersionIdx: uniqueIndex("dpp_versions_dpp_version_idx").on(table.dppId, table.versionNumber),
  }),
);

export const dppRelationships = pgTable(
  "dpp_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceDppId: uuid("source_dpp_id")
      .notNull()
      .references(() => dpps.id, { onDelete: "cascade" }),
    targetDppId: uuid("target_dpp_id").references(() => dpps.id, { onDelete: "set null" }),
    targetDigitalProductPassportId: text("target_digital_product_passport_id").notNull(),
    targetProductId: text("target_product_id"),
    relationshipType: dppRelationshipType("relationship_type").notNull(),
    visibility: visibilityLevel("visibility").notNull().default("controlled"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: index("dpp_relationships_source_idx").on(table.organizationId, table.sourceDppId),
    targetIdx: index("dpp_relationships_target_idx").on(
      table.organizationId,
      table.targetDigitalProductPassportId,
    ),
    sourceTypeTargetIdx: uniqueIndex("dpp_relationships_source_type_target_idx").on(
      table.organizationId,
      table.sourceDppId,
      table.relationshipType,
      table.targetDigitalProductPassportId,
    ),
  }),
);

export const dataDictionaryRepositories = pgTable(
  "data_dictionary_repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    repositoryKey: text("repository_key").notNull(),
    name: jsonb("name").notNull(),
    namespaceUri: text("namespace_uri").notNull(),
    version: text("version").notNull(),
    publisher: text("publisher"),
    status: repositoryStatus("status").notNull().default("draft"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Keyed by version as well: a published DPP pins a dictionary version, so
    // editing the dictionary adds a version rather than mutating the pinned one
    // . Without the version in the key an organization could only ever hold
    // one version of a given repositoryKey.
    repositoryKeyIdx: uniqueIndex("data_dictionary_repositories_org_key_version_idx").on(
      table.organizationId,
      table.repositoryKey,
      table.version,
    ),
    namespaceVersionIdx: uniqueIndex("data_dictionary_repositories_namespace_version_idx").on(
      table.namespaceUri,
      table.version,
    ),
  }),
);

export const dataDictionaryEntries = pgTable(
  "data_dictionary_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id").references(() => dataDictionaryRepositories.id, {
      onDelete: "set null",
    }),
    entryKey: text("entry_key").notNull(),
    externalId: text("external_id"),
    canonicalUri: text("canonical_uri"),
    version: text("version"),
    name: jsonb("name").notNull(),
    description: jsonb("description"),
    valueType: dataValueType("value_type").notNull(),
    unit: text("unit"),
    required: boolean("required").notNull().default(false),
    visibility: visibilityLevel("visibility").notNull().default("controlled"),
    standardReference: text("standard_reference"),
    allowedValues: jsonb("allowed_values"),
    validationRules: jsonb("validation_rules"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Uniqueness is per repository *version*, not per organization: copying a
    // dictionary to a new version duplicates every entryKey and canonicalUri by
    // design .
    entryKeyIdx: index("data_dictionary_entries_org_entry_key_idx").on(
      table.organizationId,
      table.entryKey,
    ),
    repositoryEntryKeyIdx: uniqueIndex("data_dictionary_entries_repository_entry_key_idx").on(
      table.repositoryId,
      table.entryKey,
    ),
    canonicalUriIdx: uniqueIndex("data_dictionary_entries_repository_canonical_uri_idx").on(
      table.repositoryId,
      table.canonicalUri,
    ),
    standardReferenceIdx: index("data_dictionary_entries_standard_reference_idx").on(
      table.standardReference,
    ),
  }),
);

export const schemaDefinitions = pgTable(
  "schema_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: text("version").notNull(),
    dictionaryReference: text("dictionary_reference"),
    dictionaryEntryId: uuid("dictionary_entry_id").references(() => dataDictionaryEntries.id, {
      onDelete: "set null",
    }),
    jsonSchema: jsonb("json_schema").notNull(),
    status: schemaDefinitionStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    schemaVersionIdx: uniqueIndex("schema_definitions_name_version_idx").on(
      table.organizationId,
      table.name,
      table.version,
    ),
  }),
);

export const blobObjects = pgTable("blob_objects", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  checksum: text("checksum").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// An installed connector to an external system. The row **is** the
// installation: if it does not exist, the organization does not know the
// module and none of its routes will answer. Each tenant thus decides for
// itself what is connected - not the operator for everyone.
//
// `config` carries the open settings, `credentials` the secret ones,
// encrypted (see services/secret-box.ts). Keeping them separate is not
// tidiness: it is what lets the configuration appear in a response without
// anyone having to check what is in it.
export const organizationConnectors = pgTable(
  "organization_connectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // The key from the module's manifest. Not a foreign key: modules live in
    // code, not in the database. A row whose module no longer exists is listed
    // as unknown instead of disappearing - otherwise a retired module would
    // vanish silently along with its credentials.
    connectorKey: text("connector_key").notNull(),
    status: text("status").notNull().default("active"),
    config: jsonb("config").notNull().default({}),
    credentials: text("credentials"),
    installedBy: text("installed_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgConnectorIdx: uniqueIndex("organization_connectors_org_key_idx").on(
      table.organizationId,
      table.connectorKey,
    ),
  }),
);

// Where a field of the external system belongs. Three targets, because there
// are three honest answers: do not carry it over, keep it as provenance, or
// turn it into a passport data element.
//
// `attribute` is the default, not a fallback of convenience: a field whose
// business meaning nobody has assigned does not belong in the passport.
// Keeping it without interpreting it is the only stance that neither loses
// data nor invents passport content.
export const connectorFieldTarget = pgEnum("connector_field_target", [
  "ignore",
  "attribute",
  "element",
]);

// The mapping of a source field, per organization, module, and record type.
//
// The record type (`sourceType`) is why this table is not keyed to an
// individual object: fields repeat per type, not per object. Deciding once
// where the extra fields of an asset type belong decides it for every asset of
// that type.
export const connectorFieldMappings = pgTable(
  "connector_field_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectorKey: text("connector_key").notNull(),
    // Empty string when the module does not name a record type - a NULL in a
    // unique index would let Postgres treat every row as distinct, permitting
    // unlimited mappings for the same field.
    sourceType: text("source_type").notNull().default(""),
    sourceField: text("source_field").notNull(),
    target: connectorFieldTarget("target").notNull().default("attribute"),
    // The dictionary entry this field maps to. Resolved when the passport is
    // created against `canonicalUri`, `entryKey`, or `externalId` - the same
    // resolution as for any other data element.
    dictionaryReference: text("dictionary_reference"),
    elementId: text("element_id"),
    // The parent category: the collection under which the element sits in the
    // passport. Without it, the element sits at the top level.
    collectionElementId: text("collection_element_id"),
    collectionName: text("collection_name"),
    visibility: visibilityLevel("visibility").notNull().default("controlled"),
    unit: text("unit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fieldIdx: uniqueIndex("connector_field_mappings_field_idx").on(
      table.organizationId,
      table.connectorKey,
      table.sourceType,
      table.sourceField,
    ),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dppId: uuid("dpp_id").references(() => dpps.id, { onDelete: "set null" }),
    actorUserId: text("actor_user_id").notNull(),
    eventType: text("event_type").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id").notNull(),
    patch: jsonb("patch"),
    changedProperties: jsonb("changed_properties"),
    correlationId: text("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgCreatedAtIdx: index("audit_events_org_created_at_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    dppCreatedAtIdx: index("audit_events_dpp_created_at_idx").on(table.dppId, table.createdAt),
  }),
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(organizationMemberships),
  products: many(products),
  economicOperators: many(economicOperators),
  dataDictionaryRepositories: many(dataDictionaryRepositories),
  dataDictionaryEntries: many(dataDictionaryEntries),
  dpps: many(dpps),
}));

export const dppsRelations = relations(dpps, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [dpps.organizationId],
    references: [organizations.id],
  }),
  versions: many(dppVersions),
  auditEvents: many(auditEvents),
  outgoingRelationships: many(dppRelationships, { relationName: "sourceDpp" }),
  incomingRelationships: many(dppRelationships, { relationName: "targetDpp" }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  identifiers: many(productIdentifiers),
}));

export const productIdentifiersRelations = relations(productIdentifiers, ({ one }) => ({
  product: one(products, {
    fields: [productIdentifiers.productId],
    references: [products.id],
  }),
}));

export const serviceAccountsRelations = relations(serviceAccounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [serviceAccounts.organizationId],
    references: [organizations.id],
  }),
  keys: many(apiKeys),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  serviceAccount: one(serviceAccounts, {
    fields: [apiKeys.serviceAccountId],
    references: [serviceAccounts.id],
  }),
}));

export const organizationConnectorsRelations = relations(organizationConnectors, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationConnectors.organizationId],
    references: [organizations.id],
  }),
}));

export const facilitiesRelations = relations(facilities, ({ one }) => ({
  organization: one(organizations, {
    fields: [facilities.organizationId],
    references: [organizations.id],
  }),
}));

export const economicOperatorsRelations = relations(economicOperators, ({ one }) => ({
  organization: one(organizations, {
    fields: [economicOperators.organizationId],
    references: [organizations.id],
  }),
}));

export const dataDictionaryEntriesRelations = relations(dataDictionaryEntries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [dataDictionaryEntries.organizationId],
    references: [organizations.id],
  }),
  repository: one(dataDictionaryRepositories, {
    fields: [dataDictionaryEntries.repositoryId],
    references: [dataDictionaryRepositories.id],
  }),
  schemaDefinitions: many(schemaDefinitions),
}));

export const dataDictionaryRepositoriesRelations = relations(
  dataDictionaryRepositories,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [dataDictionaryRepositories.organizationId],
      references: [organizations.id],
    }),
    entries: many(dataDictionaryEntries),
  }),
);

export const schemaDefinitionsRelations = relations(schemaDefinitions, ({ one }) => ({
  organization: one(organizations, {
    fields: [schemaDefinitions.organizationId],
    references: [organizations.id],
  }),
  dictionaryEntry: one(dataDictionaryEntries, {
    fields: [schemaDefinitions.dictionaryEntryId],
    references: [dataDictionaryEntries.id],
  }),
}));

export const dppRelationshipsRelations = relations(dppRelationships, ({ one }) => ({
  organization: one(organizations, {
    fields: [dppRelationships.organizationId],
    references: [organizations.id],
  }),
  sourceDpp: one(dpps, {
    fields: [dppRelationships.sourceDppId],
    references: [dpps.id],
    relationName: "sourceDpp",
  }),
  targetDpp: one(dpps, {
    fields: [dppRelationships.targetDppId],
    references: [dpps.id],
    relationName: "targetDpp",
  }),
}));
