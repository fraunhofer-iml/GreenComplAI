import {
  createEconomicOperator,
  createProduct,
  findEconomicOperatorByBusinessId,
  findOrganizationConnector,
  findOrganizationConnectorSecrets,
  findProductWithIdentifiersByBusinessId,
  listConnectorFieldMappings,
  listDataDictionaryEntries,
  listOrganizationConnectors,
  patchProductByBusinessId,
  recordConnectorImport,
  removeOrganizationConnector,
  saveConnectorFieldMappings,
  upsertOrganizationConnector,
} from "@dpp/db";
import {
  ConnectorAuthError,
  ConnectorRateLimitError,
  ConnectorUnavailableError,
  createAuthorize,
  createReadOnlyHttpClient,
  ForbiddenRouteError,
  type Connector,
  type ConnectorContext,
  type ExternalProduct,
} from "@dpp/connector-sdk";
import { nextVersionLabel, type OrganizationRole } from "@dpp/domain";
import type { DataValueType, ProductIdentifierInput, Visibility } from "@dpp/schemas";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { env } from "../config.js";
import { getConnector, listConnectors } from "../connectors/registry.js";
import { db } from "../db.js";
import {
  applyMapping,
  buildMappingPlan,
  reconcileDecisions,
  DOCUMENTS_FIELD,
  type AppliedMapping,
  type FieldDecision,
  type MappedField,
  type MappingCandidate,
  type MappingPlan,
  type StoredDocument,
} from "./connector-mapping.js";
import { buildDictionaryDraft, type DictionaryDraft } from "./connector-dictionary.js";
import { uploadBlob } from "./blobs.js";
import {
  getDataDictionaryRepositories,
  registerDataDictionaryEntries,
  registerDataDictionaryRepository,
  type RegisteredDictionaryEntry,
} from "./catalog.js";
import { createDppSnapshot } from "./dpps.js";
import { entitlements } from "./entitlements.js";
import {
  decryptSecret,
  encryptSecret,
  SecretBoxCorruptError,
  SecretBoxUnavailableError,
  secretStorageAvailable,
} from "./secret-box.js";

export type ConnectorResult<T> =
  | { ok: true; value: T }
  | { code: string; message: string; ok: false; status: ContentfulStatusCode };

export type ConnectorCatalogEntry = {
  key: string;
  name: string;
  description: string;
  version: string;
  vendor: string;
  capabilities: string[];
  configFields: {
    key: string;
    label: string;
    description?: string;
    placeholder?: string;
    required: boolean;
    secret: boolean;
  }[];
  installed: boolean;
  status: string | null;
  config: Record<string, string>;
  hasCredentials: boolean;
  available: boolean;
  baseUrl: string | null;
  baseUrlOverridden: boolean;
  unavailableReason: string | null;
  // Whether this instance can store secrets at all. Lives on the entry so the
  // UI can say so before someone fills out a form that is bound to fail on
  // submit.
  secretStorageAvailable: boolean;
  // An installation whose connector this instance does not (or no longer)
  // know about. It does not disappear from the list: otherwise a withdrawn
  // connector, along with its stored credentials, would vanish silently and
  // no one would think to remove it.
  known: boolean;
};

export async function getConnectorCatalog(
  organizationId: string,
): Promise<ConnectorCatalogEntry[]> {
  const installations = await listOrganizationConnectors(db, organizationId);
  const byKey = new Map(
    installations.map((installation) => [installation.connectorKey, installation]),
  );
  const storage = secretStorageAvailable();

  const entries: ConnectorCatalogEntry[] = [];
  for (const connector of listConnectors()) {
    const installation = byKey.get(connector.manifest.key);
    byKey.delete(connector.manifest.key);
    const decision = await entitlements.checkConnectorAllowed(
      organizationId,
      connector.manifest.key,
    );

    entries.push({
      key: connector.manifest.key,
      name: connector.manifest.name,
      description: connector.manifest.description,
      version: connector.manifest.version,
      vendor: connector.manifest.vendor,
      capabilities: connector.manifest.capabilities,
      configFields: connector.manifest.configFields.map((field) => ({
        key: field.key,
        label: field.label,
        description: field.description,
        placeholder: field.placeholder,
        required: field.required,
        secret: field.secret,
      })),
      installed: installation !== undefined,
      status: installation?.status ?? null,
      config: readConfig(installation?.config),
      hasCredentials: installation?.hasCredentials ?? false,
      available: decision.allowed,
      unavailableReason: decision.allowed ? null : decision.message,
      secretStorageAvailable: storage,
      known: true,
      // The host, and whether it is the manifest's. Both in the response
      // because an import from a mock that looks exactly like an import from
      // the real system is a trap someone walks into once and then doubts
      // every number they see afterwards.
      baseUrl: baseUrlFor(connector.manifest),
      baseUrlOverridden: env.CONNECTOR_BASE_URL_OVERRIDES.has(connector.manifest.key),
    });
  }

  // The two strings below and the per-document reasons further down are the
  // exception to "the API answers in English": the UI renders them verbatim
  // because they carry no code, so nothing on the other side could translate
  // them. They stay in the product's language until they have one.
  for (const orphan of byKey.values()) {
    entries.push({
      key: orphan.connectorKey,
      name: orphan.connectorKey,
      description:
        "Diese Anbindung ist für Ihre Organisation eingerichtet, in dieser Installation aber nicht vorhanden.",
      version: "-",
      vendor: "-",
      capabilities: [],
      configFields: [],
      installed: true,
      status: orphan.status,
      config: readConfig(orphan.config),
      hasCredentials: orphan.hasCredentials,
      available: false,
      unavailableReason: "Das Modul dieser Anbindung gehört nicht zu dieser Installation.",
      secretStorageAvailable: storage,
      known: false,
      // No module, so no manifest and no host to name.
      baseUrl: null,
      baseUrlOverridden: false,
    });
  }

  return entries;
}

function readConfig(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry)]),
  );
}

export async function installConnector(
  organizationId: string,
  actorUserId: string,
  connectorKey: string,
  values: Record<string, string>,
): Promise<ConnectorResult<{ key: string; status: string }>> {
  const connector = getConnector(connectorKey);
  if (!connector) {
    return fail("CONNECTOR_NOT_FOUND", "Unknown connector", 404);
  }

  const decision = await entitlements.checkConnectorAllowed(organizationId, connectorKey);
  if (!decision.allowed) {
    return fail(decision.code, decision.message, 403);
  }

  const existing = await findOrganizationConnectorSecrets(db, organizationId, connectorKey);
  // Previously stored secrets are kept if the form does not resend them.
  // Anything else would mean: whoever changes the base URL has to dig up the
  // ERP password again.
  const storedSecrets = existing?.credentials ? readStoredSecrets(existing.credentials) : {};
  if (storedSecrets === undefined) {
    return fail(
      "CONNECTOR_SECRET_CORRUPT",
      "The stored credentials could not be read. Enter them again to replace them.",
      409,
    );
  }

  const config: Record<string, string> = {};
  const secrets: Record<string, string> = { ...storedSecrets };
  const missing: string[] = [];

  for (const field of connector.manifest.configFields) {
    const provided = values[field.key]?.trim();

    if (field.secret) {
      if (provided) secrets[field.key] = provided;
      if (field.required && !secrets[field.key]) missing.push(field.key);
      continue;
    }

    if (provided) config[field.key] = provided;
    if (field.required && !config[field.key]) missing.push(field.key);
  }

  if (missing.length > 0) {
    return fail(
      "CONNECTOR_CONFIG_INCOMPLETE",
      `Missing required configuration: ${missing.join(", ")}`,
      422,
    );
  }

  let credentials: string | undefined;
  if (Object.keys(secrets).length > 0) {
    try {
      credentials = encryptSecret(JSON.stringify(secrets));
    } catch (error) {
      if (error instanceof SecretBoxUnavailableError) {
        // Deliberately no fallback to plaintext. A connector that only works
        // because the secret sits unencrypted in the database would be worse
        // than one that doesn't exist.
        return fail(error.code, error.message, 503);
      }
      throw error;
    }
  }

  const installation = await upsertOrganizationConnector(db, {
    actorUserId,
    config,
    connectorKey,
    credentials,
    organizationId,
    status: "active",
  });

  return { ok: true, value: { key: installation.connectorKey, status: installation.status } };
}

export async function uninstallConnector(
  organizationId: string,
  actorUserId: string,
  connectorKey: string,
): Promise<ConnectorResult<{ key: string }>> {
  const removed = await removeOrganizationConnector(db, {
    actorUserId,
    connectorKey,
    organizationId,
  });
  if (!removed) {
    return fail("CONNECTOR_NOT_INSTALLED", "This connector is not installed", 404);
  }

  return { ok: true, value: { key: removed.connectorKey } };
}

export async function setConnectorStatus(
  organizationId: string,
  actorUserId: string,
  connectorKey: string,
  status: "active" | "disabled",
): Promise<ConnectorResult<{ key: string; status: string }>> {
  const installed = await findOrganizationConnector(db, organizationId, connectorKey);
  if (!installed) {
    return fail("CONNECTOR_NOT_INSTALLED", "This connector is not installed", 404);
  }

  const installation = await upsertOrganizationConnector(db, {
    actorUserId,
    config: readConfig(installed.config),
    connectorKey,
    organizationId,
    status,
  });

  return { ok: true, value: { key: installation.connectorKey, status: installation.status } };
}

export async function testConnector(
  organizationId: string,
  connectorKey: string,
): Promise<ConnectorResult<{ ok: true }>> {
  return withConnector(organizationId, connectorKey, async (connector, context) => {
    await connector.checkConnection(context);

    return { ok: true, value: { ok: true } as const };
  });
}

export async function lookupExternalProduct(
  organizationId: string,
  connectorKey: string,
  externalId: string,
): Promise<ConnectorResult<ExternalProduct>> {
  return withConnector(organizationId, connectorKey, async (connector, context) => {
    if (!connector.manifest.capabilities.includes("lookupByExternalId")) {
      return fail("CONNECTOR_CAPABILITY_MISSING", "This connector cannot look products up", 400);
    }

    const product = await connector.lookupByExternalId(context, externalId);
    if (!product) {
      return fail(
        "EXTERNAL_PRODUCT_NOT_FOUND",
        `No record with the identifier "${externalId}" exists in the connected system`,
        404,
      );
    }

    return { ok: true, value: product };
  });
}

// The preview: the product **and** what would happen to its fields.
//
// Both together, because both are needed together - a user who sees the
// values but not their destination can't decide anything, and neither can one
// who sees the destinations but not the values.
export async function previewExternalProduct(
  organizationId: string,
  connectorKey: string,
  externalId: string,
): Promise<
  ConnectorResult<{
    dictionaryDraft: DictionaryDraft;
    mapping: MappingPlan;
    product: ExternalProduct;
  }>
> {
  const looked = await lookupExternalProduct(organizationId, connectorKey, externalId);
  if (!looked.ok) return looked;

  const mapping = await planFor(organizationId, connectorKey, looked.value);

  return {
    ok: true,
    value: {
      // The draft travels with the preview rather than behind a second route:
      // it is derived from the same plan, and fetching it separately would
      // mean a second call into the external system for data already in hand -
      // against a rate limit the module committed to honoring.
      dictionaryDraft: buildDictionaryDraft(looked.value, mapping, {
        connectorKey,
        namespaceBase: `${env.API_ORIGIN}/dictionaries/o/${organizationId}`,
        version: nextVersionLabel([], new Date()),
      }),
      mapping,
      product: looked.value,
    },
  };
}

async function planFor(organizationId: string, connectorKey: string, product: ExternalProduct) {
  const sourceType = product.sourceType?.key ?? "";
  const [decisions, candidates] = await Promise.all([
    readDecisions(organizationId, connectorKey, sourceType),
    readCandidates(organizationId),
  ]);

  return buildMappingPlan(product, decisions, candidates);
}

// The organization's dictionary entries as possible mapping targets. They
// come from the same source a passport is later validated against - a
// suggestion pointing at something other than the later check would be worse
// than none.
async function readCandidates(organizationId: string): Promise<MappingCandidate[]> {
  const [entries, repositories] = await Promise.all([
    listDataDictionaryEntries(db, organizationId),
    getDataDictionaryRepositories(organizationId),
  ]);
  // Which dictionary an entry belongs to travels with the candidate. The draft
  // wizard leaves out fields the dictionary already describes, and that is only
  // a reason to leave them out of *that* dictionary.
  const repositoryKeys = new Map(
    repositories.map((repository) => [repository.id, repository.repositoryKey]),
  );

  return entries.map((entry) => {
    const category = entryCategory(entry.metadata);

    return {
      categoryId: category?.id,
      categoryLabel: category?.label,
      // Resolved against `canonicalUri`, `entryKey`, or `externalId` - the
      // canonical URI is the most stable of the three.
      dictionaryReference: entry.canonicalUri ?? entry.entryKey,
      label: translatable(entry.name) ?? entry.entryKey,
      repositoryKey: (entry.repositoryId ? repositoryKeys.get(entry.repositoryId) : "") ?? "",
      unit: entry.unit ?? undefined,
      visibility: entry.visibility,
    };
  });
}

// The parent category lives in the entry's metadata - the same field the
// catalog UI builds its grouping from.
function entryCategory(metadata: unknown): { id: string; label: string } | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const category = (metadata as { category?: unknown }).category;
  if (!category || typeof category !== "object") return undefined;

  const { id, name } = category as { id?: unknown; name?: unknown };
  if (typeof id !== "string" || id.length === 0) return undefined;

  return { id, label: translatable(name) ?? id };
}

function translatable(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const first = record.de ?? record.en ?? Object.values(record)[0];

  return typeof first === "string" ? first : undefined;
}

// The database knows `null`, the contract knows `undefined`. The translation
// lives in one place so it doesn't get reinvented at every call site.
async function readDecisions(
  organizationId: string,
  connectorKey: string,
  sourceType: string,
): Promise<FieldDecision[]> {
  const stored = await listConnectorFieldMappings(db, organizationId, connectorKey, sourceType);

  return stored.map((decision) => ({
    sourceField: decision.sourceField,
    target: decision.target,
    visibility: decision.visibility,
    collectionElementId: decision.collectionElementId ?? undefined,
    collectionName: decision.collectionName ?? undefined,
    dictionaryReference: decision.dictionaryReference ?? undefined,
    elementId: decision.elementId ?? undefined,
    unit: decision.unit ?? undefined,
  }));
}

// The stored mapping for a record type, without having to look up a record
// to get it - used for managing mapping profiles.
export async function getMappingProfile(
  organizationId: string,
  connectorKey: string,
  sourceType: string,
): Promise<ConnectorResult<{ fields: FieldDecision[]; sourceType: string }>> {
  if (!getConnector(connectorKey)) {
    return fail("CONNECTOR_NOT_FOUND", "Unknown connector", 404);
  }

  return {
    ok: true,
    value: { sourceType, fields: await readDecisions(organizationId, connectorKey, sourceType) },
  };
}

// Maintain a profile without having to run an import for it. The submitted
// fields are set, the rest are left untouched - a form shows the fields of
// one record, and another record of the same type can carry fields that
// didn't happen to appear there.
export async function saveMappingProfile(
  organizationId: string,
  actorUserId: string,
  connectorKey: string,
  sourceType: string,
  fields: FieldDecision[],
): Promise<ConnectorResult<{ fields: FieldDecision[]; sourceType: string }>> {
  if (!getConnector(connectorKey)) {
    return fail("CONNECTOR_NOT_FOUND", "Unknown connector", 404);
  }

  await saveConnectorFieldMappings(db, {
    actorUserId,
    connectorKey,
    fields,
    organizationId,
    sourceType,
  });

  return getMappingProfile(organizationId, connectorKey, sourceType);
}

// --- Drafting a dictionary from a record type -------------------------------

export type DictionaryCreationTarget =
  | {
      mode: "new";
      name: string;
      namespaceUri: string;
      repositoryKey: string;
      version: string;
    }
  | { mode: "existing"; repositoryKey: string };

export type DictionaryCreationInput = {
  // The parent category the new entries are filed under, or nothing. Only a
  // category the target dictionary already declares - the import proposes
  // vocabulary, it does not invent taxonomy.
  category?: { id: string; label: string } | null | undefined;
  entries: {
    allowedValues?: (string | number | boolean | null)[] | null | undefined;
    description?: string | null | undefined;
    entryKey: string;
    name: string;
    required?: boolean | undefined;
    sourceField: string;
    unit?: string | null | undefined;
    valueType: DataValueType;
    visibility: Visibility;
  }[];
  // The record kind the entries were drafted from. It becomes the entries'
  // parent category, which is what later groups them into one collection in
  // the passport - the same grouping the catalogue UI builds from.
  sourceType: { key: string; label: string };
  target: DictionaryCreationTarget;
};

// What one entry means for the mapping: the reference to point at, and the
// collection the element belongs in.
export type DictionaryPlacement = {
  collection: { id: string; label: string } | null;
  dictionaryReference: string;
  entryKey: string;
  sourceField: string;
};

export type DictionaryCreation = {
  // Per source field, the reference the mapping can now point at. This is the
  // whole point of the response: the caller does not have to look up what it
  // just created to be able to use it.
  created: DictionaryPlacement[];
  // The entries the dictionary already held, in the same shape. Reported apart
  // so the count stays honest, but just as usable: whether an entry was written
  // a second ago or a week ago changes nothing about the mapping that points at
  // it. Returning these without a reference is what left every field unassigned
  // on the second run of this wizard against the same dictionary.
  existing: DictionaryPlacement[];
  repositoryKey: string;
  repositoryVersion: string;
};

// Creates the dictionary a record type's fields were drafted into.
//
// This writes to the catalogue, not to a passport - and it goes through the
// same catalogue service a hand-built dictionary goes through, including
// copy-on-write versioning (G65). An import route that wrote dictionary rows
// on its own would be a second way into the vocabulary, and the second way is
// always the one that skips a check.
export async function createDictionaryFromDraft(
  organizationId: string,
  connectorKey: string,
  input: DictionaryCreationInput,
): Promise<ConnectorResult<DictionaryCreation>> {
  if (!getConnector(connectorKey)) {
    return fail("CONNECTOR_NOT_FOUND", "Unknown connector", 404);
  }
  if (input.entries.length === 0) {
    return fail("DICTIONARY_DRAFT_EMPTY", "The draft holds no entries", 422);
  }

  const repositoryKey = input.target.repositoryKey;

  if (input.target.mode === "new") {
    // Refusing rather than falling back to the existing dictionary: "create a
    // new one" and "add to that one" are different intentions, and silently
    // turning the first into the second writes into a vocabulary nobody
    // pointed at.
    const existing = await getDataDictionaryRepositories(organizationId);
    if (existing.some((repository) => repository.repositoryKey === repositoryKey)) {
      return fail(
        "DATA_DICTIONARY_REPOSITORY_EXISTS",
        `A dictionary with the key "${repositoryKey}" already exists`,
        409,
      );
    }

    await registerDataDictionaryRepository(organizationId, {
      metadata: {
        source: {
          connector: connectorKey,
          sourceType: input.sourceType.key,
          sourceTypeLabel: input.sourceType.label,
        },
      },
      name: { de: input.target.name },
      namespaceUri: input.target.namespaceUri,
      repositoryKey,
      status: "draft",
      version: input.target.version,
    });
  }

  // No category unless the caller names one, and the caller may only name one
  // the dictionary already declares.
  //
  // This used to invent one from the record kind - every field of a SIMPL asset
  // type landed under "Standardmaschine". That is the source system's axis, not
  // the vocabulary's: this catalogue groups by subject (identification, dimensions and
  // weight, sustainability), and a dictionary sorted by "which ERP table did
  // this come from" is a mirror of the ERP rather than a vocabulary. It also
  // meant the same concept arriving from a second record kind would sit under a
  // second heading, and that the passport's collection was named after an asset
  // type instead of after what the fields are about.
  //
  // Inventing taxonomy is exactly what this whole feature refuses to do
  // elsewhere. Without a category an entry lands in "Default", where someone can
  // file it - in the catalogue, which is where categories are created.
  const category = input.category
    ? { id: input.category.id, name: { de: input.category.label } }
    : undefined;

  const outcome = await registerDataDictionaryEntries(
    organizationId,
    repositoryKey,
    input.entries.map((entry) => ({
      allowedValues: entry.allowedValues ?? undefined,
      description: entry.description ? { de: entry.description } : undefined,
      entryKey: entry.entryKey,
      // Where the entry came from, kept on the entry itself. Six months later
      // "why does the dictionary have this field" is a question someone will
      // ask, and the answer belongs next to the field rather than in a log.
      metadata: {
        ...(category ? { category } : {}),
        source: {
          connector: connectorKey,
          field: entry.sourceField,
          sourceType: input.sourceType.key,
        },
      },
      name: { de: entry.name },
      required: entry.required ?? false,
      unit: entry.unit ?? undefined,
      valueType: entry.valueType,
      visibility: entry.visibility,
    })),
  );
  if (!outcome.ok) {
    return fail(outcome.code, outcome.message, outcome.status as ContentfulStatusCode);
  }

  const bySourceField = new Map(input.entries.map((entry) => [entry.entryKey, entry.sourceField]));

  // The collection an element goes into is the entry's own category, not the one
  // this request proposed. For an entry written just now the two are the same;
  // for one the dictionary already held they need not be, and the entry that
  // exists is the one that knows where it belongs.
  const placement = (entry: RegisteredDictionaryEntry): DictionaryPlacement => ({
    collection: entryCategory(entry.metadata) ?? null,
    dictionaryReference: entry.canonicalUri,
    entryKey: entry.entryKey,
    sourceField: bySourceField.get(entry.entryKey) ?? entry.entryKey,
  });

  return {
    ok: true,
    value: {
      created: outcome.value.created.map(placement),
      existing: outcome.value.existing.map(placement),
      repositoryKey: outcome.value.repositoryKey,
      repositoryVersion: outcome.value.version,
    },
  };
}

export type ImportedProduct = {
  created: boolean;
  productId: string;
  name: unknown;
  identifiers: unknown[];
  // The created passport, if one was requested. `undefined` means: catalog
  // entry only - the common case.
  dpp?: { digitalProductPassportId: string; publicId: string } | undefined;
  // What the passport didn't get despite being requested. An import that
  // writes the catalog entry but fails at the passport step says so, instead
  // of pretending everything happened.
  dppError?: { code: string; message: string } | undefined;
  // Documents that didn't make it into the passport, with the reason. An
  // import that silently drops half of them does more damage than one that
  // fetched nothing at all.
  skippedDocuments: { name: string; reason: string }[];
};

export type ImportOptions = {
  // The decisions from the preview. If absent, the stored profile applies; if
  // that's also absent, the default (carry over as provenance).
  fields?: FieldDecision[] | undefined;
  // Whether the decisions are kept for the next import of the same record
  // type. Defaults to yes: otherwise the same mapping would have to be
  // repeated on every import, which is exactly what the profile is meant to
  // save.
  saveMapping?: boolean | undefined;
  // Only set if a passport draft should be created from the product right away.
  dpp?:
    | {
        granularity: string;
        dppSchemaVersion: string;
        economicOperatorId: string;
        facilityId?: string | undefined;
      }
    | undefined;
};

// Imports a product from the external system.
//
// Deliberately two-stage: look up and inspect first (`previewExternalProduct`),
// then import. An import that writes immediately when an identifier is typed
// removes the user's only chance to notice they typed the wrong one.
//
// The catalog entry is always created; the **passport** only on request. That
// isn't caution, it's the order facts become available in: granularity,
// schema version, and the responsible economic operator aren't in the ERP.
// Whoever supplies them gets the draft right away; whoever doesn't gets the
// product and creates the passport once they know them.
export async function importExternalProduct(
  organizationId: string,
  actorUserId: string,
  connectorKey: string,
  externalId: string,
  role: OrganizationRole,
  options: ImportOptions = {},
): Promise<ConnectorResult<ImportedProduct>> {
  const looked = await lookupExternalProduct(organizationId, connectorKey, externalId);
  if (!looked.ok) return looked;

  const external = looked.value;
  const productId = external.externalId;
  const existing = await findProductWithIdentifiersByBusinessId(db, organizationId, productId);

  await ensureManufacturer(organizationId, external);

  // The decisions from the request only apply to fields this record actually
  // has - otherwise the mapping table could be filled with arbitrary content
  // through this route.
  const plan = await planFor(organizationId, connectorKey, external);
  const fields = options.fields ? reconcileDecisions(plan, options.fields) : plan.fields;
  const documents = await storeDocuments(
    organizationId,
    actorUserId,
    connectorKey,
    external,
    fields,
  );
  const applied = applyMapping(fields, documents.stored);

  if (options.fields && options.saveMapping !== false) {
    await saveConnectorFieldMappings(db, {
      actorUserId,
      connectorKey,
      organizationId,
      sourceType: plan.sourceType.key,
      fields: fields.map((field) => ({
        collectionElementId: field.collectionElementId,
        collectionName: field.collectionName,
        dictionaryReference: field.dictionaryReference,
        elementId: field.elementId,
        sourceField: field.sourceField,
        target: field.target,
        unit: field.unit,
        visibility: field.visibility,
      })),
    });
  }

  // Provenance stays attached to the product: without it, after six months
  // there's no telling which value was maintained by hand and which was
  // imported. `attributes` now holds only what the user wanted *there* -
  // what they mapped into the passport lives in the passport, and what they
  // discarded lives nowhere.
  const metadata = {
    source: {
      connector: connectorKey,
      externalId: external.externalId,
      importedAt: new Date().toISOString(),
      sourceUpdatedAt: external.updatedAt,
      sourceType: plan.sourceType.key,
      attributes: applied.attributes,
    },
  };

  const identifiers = mergeIdentifiers(external, existing?.identifiers ?? []);
  const name = { de: external.name, en: external.name };

  // A second import of the same identifier does not create a second product,
  // it refreshes the existing one. The anchor for that is the external
  // identifier, which is why it's also the product identifier.
  //
  // `manufacturerProductId` is deliberately not written. It is the number the
  // manufacturer lists the article under, and the SDK's normal form carries no
  // such field - a module that has one delivers it as an identifier (`sku` for
  // an article number, `model` for a type designation). It used to be filled
  // with the manufacturer's *organisation* id, which made the catalogue claim
  // the part number of ERP-1001 was "org-100".
  const saved = existing
    ? await patchProductByBusinessId(db, organizationId, productId, {
        name,
        category: external.category,
        identifiers,
        metadata,
      })
    : await createProduct(db, organizationId, {
        productId,
        name,
        category: external.category,
        lifecycleStatus: "active",
        identifiers,
        metadata,
      });
  if (!saved) {
    return fail("PRODUCT_NOT_FOUND", "The product disappeared while importing", 409);
  }

  await recordConnectorImport(db, {
    actorUserId,
    connectorKey,
    created: existing === undefined,
    externalId: external.externalId,
    organizationId,
    productId: saved.productId,
  });

  const dpp = options.dpp
    ? await createDppFromImport(organizationId, actorUserId, role, productId, options.dpp, applied)
    : undefined;

  return {
    ok: true,
    value: {
      created: existing === undefined,
      productId: saved.productId,
      name: saved.name,
      identifiers: saved.identifiers,
      dpp: dpp?.ok ? dpp.value : undefined,
      dppError: dpp?.ok === false ? { code: dpp.code, message: dpp.message } : undefined,
      skippedDocuments: documents.skipped,
    },
  };
}

// The passport draft built from the mapped fields.
//
// It goes through `createDppSnapshot` and therefore through the same checks
// as any other passport: resolved references, dictionary validation, role and
// policy gates. An import is not a side door that lets passport content skip
// those checks.
//
// If it fails, that's no reason to roll back the catalog entry: the entry is
// correct on its own, and the user is told what the passport step failed on.
async function createDppFromImport(
  organizationId: string,
  actorUserId: string,
  role: OrganizationRole,
  productId: string,
  dpp: NonNullable<ImportOptions["dpp"]>,
  applied: AppliedMapping,
): Promise<
  | { ok: true; value: { digitalProductPassportId: string; publicId: string } }
  | { ok: false; code: string; message: string }
> {
  const result = await createDppSnapshot(
    organizationId,
    actorUserId,
    {
      productId,
      granularity: dpp.granularity,
      dppSchemaVersion: dpp.dppSchemaVersion,
      economicOperatorId: dpp.economicOperatorId,
      facilityId: dpp.facilityId,
      collections: applied.collections,
      dataElements: applied.dataElements,
    },
    role,
  );
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  return {
    ok: true,
    value: {
      digitalProductPassportId: result.value.dpp.digitalProductPassportId,
      publicId: result.value.publicId,
    },
  };
}

// The maximum number of documents an import fetches.
//
// The cap is not about frugality but consideration: each file is a call
// against a foreign rate limit, and a record with a hundred attachments would
// turn an import into a minutes-long operation. Whatever is left over is
// reported, not silently dropped.
const MAX_DOCUMENTS_PER_IMPORT = 20;

// Fetches the documents the user wanted in the passport - and only those.
//
// The bytes run through `uploadBlob` and therefore through the same checks as
// a file from the browser: allowed MIME type, size limit, signature check,
// virus scan, checksum over what was actually stored. Bytes from an ERP are
// no more trustworthy than bytes from a form.
//
// A document that fails there does not abort the whole import: it's just
// missing from the passport, and the response says why.
async function storeDocuments(
  organizationId: string,
  actorUserId: string,
  connectorKey: string,
  external: ExternalProduct,
  fields: readonly MappedField[],
): Promise<{ skipped: { name: string; reason: string }[]; stored: StoredDocument[] }> {
  const decision = fields.find((field) => field.sourceField === DOCUMENTS_FIELD);
  const stored: StoredDocument[] = [];
  const skipped: { name: string; reason: string }[] = [];

  if (
    !decision ||
    decision.target !== "element" ||
    !decision.dictionaryReference ||
    external.documents.length === 0
  ) {
    return { skipped, stored };
  }

  const wanted = external.documents.slice(0, MAX_DOCUMENTS_PER_IMPORT);
  for (const document of external.documents.slice(MAX_DOCUMENTS_PER_IMPORT)) {
    skipped.push({
      name: document.name,
      reason: `Nur die ersten ${MAX_DOCUMENTS_PER_IMPORT} Dokumente werden je Übernahme geholt.`,
    });
  }

  for (const document of wanted) {
    const fetched = await fetchDocument(organizationId, connectorKey, document.externalId);
    if (!fetched.ok) {
      skipped.push({ name: document.name, reason: fetched.message });
      continue;
    }
    if (!fetched.value) {
      skipped.push({ name: document.name, reason: "Im Fremdsystem nicht mehr vorhanden." });
      continue;
    }

    const uploaded = await uploadBlob({
      actorUserId,
      organizationId,
      file: new File([new Uint8Array(fetched.value.body)], document.name, {
        // What the external system claims is taken as a hint - it's checked
        // against the actual bytes, same as for any other upload.
        type: fetched.value.mimeType,
      }),
    });
    if (!uploaded.ok) {
      skipped.push({ name: document.name, reason: uploaded.message });
      continue;
    }

    stored.push({
      blobObjectId: uploaded.value.id,
      collectionElementId: decision.collectionElementId,
      collectionName: decision.collectionName,
      contentType: uploaded.value.contentType,
      dictionaryReference: decision.dictionaryReference,
      // Derived from the identifier in the external system: it's what makes
      // the same document recognizable on a second import.
      elementId: `document-${document.externalId}`.replace(/[^a-zA-Z0-9_.-]/g, "-"),
      filename: uploaded.value.filename,
      visibility: decision.visibility,
    });
  }

  return { skipped, stored };
}

async function fetchDocument(
  organizationId: string,
  connectorKey: string,
  externalDocumentId: string,
): Promise<ConnectorResult<{ body: ArrayBuffer; mimeType: string } | undefined>> {
  return withConnector(organizationId, connectorKey, async (connector, context) => {
    if (!connector.manifest.capabilities.includes("documents") || !connector.downloadDocument) {
      return fail(
        "CONNECTOR_CAPABILITY_MISSING",
        "Dieses Modul kann keine Dokumente herunterladen.",
        400,
      );
    }

    return { ok: true, value: await connector.downloadDocument(context, externalDocumentId) };
  });
}

// The manufacturer is created if it doesn't exist yet - but never
// overwritten. What someone maintained in the catalog (address, VAT id,
// roles) is worth more than what an external system happens to supply.
async function ensureManufacturer(organizationId: string, external: ExternalProduct) {
  const manufacturer = external.manufacturer;
  if (!manufacturer) return;

  const existing = await findEconomicOperatorByBusinessId(
    db,
    organizationId,
    manufacturer.externalId,
  );
  if (existing) return;

  await createEconomicOperator(db, organizationId, {
    operatorId: manufacturer.externalId,
    legalName: manufacturer.legalName,
    roles: manufacturer.roles.length > 0 ? manufacturer.roles : ["manufacturer"],
    countryCode: manufacturer.address?.countryCode,
    address: manufacturer.address ? { ...manufacturer.address } : undefined,
  });
}

// The product's identifiers are merged, not replaced. The catalog fully
// replaces them on write - passing it only the imported ones would lose every
// hand-maintained identifier on the next import.
function mergeIdentifiers(
  external: ExternalProduct,
  existing: readonly {
    identifierType: ProductIdentifierInput["identifierType"];
    identifierValue: string;
    issuer?: string | null;
  }[],
): ProductIdentifierInput[] {
  const merged = new Map<string, ProductIdentifierInput>();

  for (const identifier of existing) {
    merged.set(`${identifier.identifierType}:${identifier.identifierValue}`, {
      identifierType: identifier.identifierType,
      identifierValue: identifier.identifierValue,
      issuer: identifier.issuer ?? undefined,
    });
  }

  // The external system wins on `issuer` when the same identifier is already
  // there: it's the source that supplied it.
  for (const identifier of external.identifiers) {
    merged.set(`${identifier.type}:${identifier.value}`, {
      identifierType: identifier.type,
      identifierValue: identifier.value,
      issuer: identifier.issuer,
    });
  }

  return [...merged.values()];
}

// The authorize function outlives a single request - and needs to.
//
// `createAuthorize` caches the exchanged token until shortly before it
// expires. That saving is lost, though, if a new authorize function is
// created for every incoming request: then every lookup is preceded by a
// second call to the external system, the token exchange. At SIMPL's 3
// requests per second, that's half the rate limit spent on a token that
// would otherwise be valid for 24 hours.
//
// The cache key contains the encrypted credential envelope. That gives
// invalidation for free: new credentials produce different ciphertext and
// therefore a different cache entry - there is no path on which changed
// credentials could keep hanging off a stale token.
const authorizeCache = new Map<string, () => Promise<Record<string, string>>>();

// The host a module actually talks to.
//
// Normally the one its manifest names, and only that one: the base URL is not a
// tenant setting precisely because it decides where stored credentials travel.
// In development a local mock may stand in (`CONNECTOR_BASE_URL_OVERRIDES`), so
// the import and the dictionary wizard can be exercised without a real ERP on
// the other end. The config layer refuses the switch in production.
function baseUrlFor(manifest: { baseUrl: string; key: string }): string {
  return env.CONNECTOR_BASE_URL_OVERRIDES.get(manifest.key) ?? manifest.baseUrl;
}

function authorizeFor(
  organizationId: string,
  connectorKey: string,
  connector: Connector,
  values: Record<string, string>,
  credentialEnvelope: string | null,
) {
  const cacheKey = `${organizationId}:${connectorKey}:${credentialEnvelope ?? ""}`;
  const cached = authorizeCache.get(cacheKey);
  if (cached) return cached;

  const authorize = createAuthorize({
    baseUrl: baseUrlFor(connector.manifest),
    spec: connector.manifest.auth,
    values,
  });
  if (!authorize) return undefined;

  // One entry per tenant and connector; the outliers are stale credential
  // entries left behind after a change. A coarse upper bound is enough to
  // keep the map from growing unnoticed.
  if (authorizeCache.size > 500) authorizeCache.clear();
  authorizeCache.set(cacheKey, authorize);

  return authorize;
}

// Builds a connector's runtime context and runs a call inside it.
//
// What's included is the real point: the connector gets an HTTP client, the
// non-secret config, and a logging channel. It does **not** get the
// credentials (those become headers it never sees), **not** the database,
// and **not** the ability to call anything beyond the allowlisted read
// routes.
async function withConnector<T>(
  organizationId: string,
  connectorKey: string,
  run: (connector: Connector, context: ConnectorContext) => Promise<ConnectorResult<T>>,
): Promise<ConnectorResult<T>> {
  const connector = getConnector(connectorKey);
  if (!connector) {
    return fail("CONNECTOR_NOT_FOUND", "Unknown connector", 404);
  }

  const installation = await findOrganizationConnectorSecrets(db, organizationId, connectorKey);
  if (!installation) {
    return fail("CONNECTOR_NOT_INSTALLED", "This connector is not installed", 404);
  }
  if (installation.status !== "active") {
    return fail("CONNECTOR_DISABLED", "This connector is switched off", 409);
  }

  const decision = await entitlements.checkConnectorAllowed(organizationId, connectorKey);
  if (!decision.allowed) {
    return fail(decision.code, decision.message, 403);
  }

  const config = readConfig(installation.config);
  const secrets = installation.credentials ? readStoredSecrets(installation.credentials) : {};
  if (secrets === undefined) {
    return fail(
      "CONNECTOR_SECRET_CORRUPT",
      "The stored credentials could not be read. Enter them again in the connector settings.",
      409,
    );
  }

  const { manifest } = connector;
  let authorize: (() => Promise<Record<string, string>>) | undefined;
  try {
    authorize = authorizeFor(
      organizationId,
      connectorKey,
      connector,
      {
        ...config,
        ...secrets,
      },
      installation.credentials,
    );
  } catch (error) {
    return toFailure(error, connectorKey);
  }

  const context: ConnectorContext = {
    http: createReadOnlyHttpClient({
      baseUrl: baseUrlFor(manifest),
      allowlist: manifest.allowlist,
      authorize,
      rateLimit: manifest.rateLimit,
      onRequest: (event) => {
        // Every outbound call leaves a line in the operational log.
        // Deliberately not in audit_events: that table records what happens
        // to the tenant's data, and an entry per HTTP call would bury the
        // business history under traffic data. The business-level events
        // (installing, importing) still go there.
        console.info(
          `[connector] ${connectorKey} ${event.method} ${event.url} -> ${event.status ?? event.error} (${event.durationMs}ms)`,
        );
      },
    }),
    config: Object.freeze({ ...config }),
    log: (message, detail) => {
      console.info(`[connector] ${connectorKey} ${message}`, detail ?? "");
    },
  };

  try {
    return await run(connector, context);
  } catch (error) {
    return toFailure(error, connectorKey);
  }
}

// Translates what a connector can throw into a response that states
// something true. Anything not listed here is a bug in *our* code and is not
// disguised as a statement about the external system - it propagates and
// becomes a 500 with a correlation id.
function toFailure(error: unknown, connectorKey: string): ConnectorResult<never> {
  if (error instanceof ForbiddenRouteError) {
    // This is neither an operator error nor an external-system error, but a
    // connector attempting something it isn't allowed to. It should stand out.
    console.error(`[connector] ${connectorKey} attempted a forbidden route: ${error.message}`);
    return fail(error.code, "The connector attempted a call that is not permitted", 500);
  }
  if (error instanceof ConnectorAuthError) return fail(error.code, error.message, 502);
  if (error instanceof ConnectorRateLimitError) return fail(error.code, error.message, 503);
  if (error instanceof ConnectorUnavailableError) return fail(error.code, error.message, 502);
  if (error instanceof SecretBoxUnavailableError) return fail(error.code, error.message, 503);
  if (error instanceof SecretBoxCorruptError) return fail(error.code, error.message, 409);

  throw error;
}

// `undefined` means "not readable" and must be distinguished from "none
// stored" (`{}`): the former requires new credentials, the latter is the
// normal case for a connector without a secret.
function readStoredSecrets(envelope: string): Record<string, string> | undefined {
  try {
    const parsed: unknown = JSON.parse(decryptSecret(envelope));
    if (!parsed || typeof parsed !== "object") return undefined;

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
    );
  } catch {
    return undefined;
  }
}

function fail(code: string, message: string, status: ContentfulStatusCode): ConnectorResult<never> {
  return { code, message, ok: false, status };
}
