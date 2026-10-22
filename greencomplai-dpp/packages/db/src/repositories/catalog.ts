import { and, asc, count, eq, inArray, isNotNull, ne, or } from "drizzle-orm";

import { latestVersionLabel } from "@dpp/domain";
import type {
  DataValueType,
  DataDictionaryRepository,
  EconomicOperatorRole,
  ProductIdentifierType,
  ProductLifecycleStatus,
  VisibilityLevel,
} from "@dpp/domain";

import type { Database } from "../index.js";

// A database handle inside a transaction; same query surface as Database.
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
import {
  dataDictionaryEntries,
  dataDictionaryRepositories,
  dpps,
  economicOperators,
  facilities,
  productIdentifiers,
  products,
} from "../schema.js";

const economicOperatorResponseColumns = {
  address: economicOperators.address,
  countryCode: economicOperators.countryCode,
  createdAt: economicOperators.createdAt,
  id: economicOperators.id,
  legalName: economicOperators.legalName,
  metadata: economicOperators.metadata,
  operatorId: economicOperators.operatorId,
  roles: economicOperators.roles,
  updatedAt: economicOperators.updatedAt,
  vatId: economicOperators.vatId,
};

const dictionaryRepositoryResponseColumns = {
  createdAt: dataDictionaryRepositories.createdAt,
  id: dataDictionaryRepositories.id,
  metadata: dataDictionaryRepositories.metadata,
  name: dataDictionaryRepositories.name,
  namespaceUri: dataDictionaryRepositories.namespaceUri,
  publisher: dataDictionaryRepositories.publisher,
  repositoryKey: dataDictionaryRepositories.repositoryKey,
  status: dataDictionaryRepositories.status,
  updatedAt: dataDictionaryRepositories.updatedAt,
  version: dataDictionaryRepositories.version,
};

const dictionaryEntryResponseColumns = {
  allowedValues: dataDictionaryEntries.allowedValues,
  canonicalUri: dataDictionaryEntries.canonicalUri,
  createdAt: dataDictionaryEntries.createdAt,
  description: dataDictionaryEntries.description,
  entryKey: dataDictionaryEntries.entryKey,
  externalId: dataDictionaryEntries.externalId,
  id: dataDictionaryEntries.id,
  metadata: dataDictionaryEntries.metadata,
  name: dataDictionaryEntries.name,
  repositoryId: dataDictionaryEntries.repositoryId,
  required: dataDictionaryEntries.required,
  standardReference: dataDictionaryEntries.standardReference,
  unit: dataDictionaryEntries.unit,
  updatedAt: dataDictionaryEntries.updatedAt,
  validationRules: dataDictionaryEntries.validationRules,
  valueType: dataDictionaryEntries.valueType,
  version: dataDictionaryEntries.version,
  visibility: dataDictionaryEntries.visibility,
};

type CreateProductInput = {
  category?: string | undefined;
  // Normalized: the switch between map and list form lives in the schema, so
  // only one form remains down here.
  identifiers?: ProductIdentifierInput[] | undefined;
  lifecycleStatus: ProductLifecycleStatus;
  manufacturerProductId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  name: Record<string, string>;
  productId: string;
};

type CreateEconomicOperatorInput = {
  address?: Record<string, unknown> | undefined;
  countryCode?: string | undefined;
  legalName: string;
  metadata?: Record<string, unknown> | undefined;
  operatorId: string;
  roles: EconomicOperatorRole[];
  vatId?: string | undefined;
};

type ProductIdentifierInput = {
  identifierType: ProductIdentifierType;
  identifierValue: string;
  issuer?: string | undefined;
};

type FacilityType = (typeof facilities.$inferSelect)["facilityType"];

type CreateFacilityInput = {
  address?: Record<string, unknown> | undefined;
  countryCode?: string | undefined;
  facilityId: string;
  facilityType: FacilityType;
  metadata?: Record<string, unknown> | undefined;
  name: string;
  operatorId?: string | undefined;
};

type CreateDataDictionaryEntryInput = {
  allowedValues?: unknown[] | undefined;
  description?: Record<string, string> | undefined;
  entryKey: string;
  externalId?: string | undefined;
  canonicalUri?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  name: Record<string, string>;
  repositoryId?: string | undefined;
  repositoryKey?: string | undefined;
  required: boolean;
  standardReference?: string | undefined;
  unit?: string | undefined;
  validationRules?: Record<string, unknown> | undefined;
  version?: string | undefined;
  valueType: DataValueType;
  visibility: VisibilityLevel;
};

type CreateDataDictionaryRepositoryInput = {
  metadata?: Record<string, unknown> | undefined;
  name: Record<string, string>;
  namespaceUri: string;
  publisher?: string | undefined;
  repositoryKey: string;
  status: DataDictionaryRepository["status"];
  version: string;
};

type PatchProductInput = Partial<Omit<CreateProductInput, "productId">>;
type PatchEconomicOperatorInput = Partial<Omit<CreateEconomicOperatorInput, "operatorId">>;
type PatchFacilityInput = Partial<Omit<CreateFacilityInput, "facilityId">>;
type PatchDataDictionaryRepositoryInput = Partial<
  Omit<CreateDataDictionaryRepositoryInput, "repositoryKey">
>;
type PatchDataDictionaryEntryInput = Partial<Omit<CreateDataDictionaryEntryInput, "entryKey">>;

export async function listProducts(db: Database, organizationId: string) {
  const rows = await db
    .select(productResponseColumns)
    .from(products)
    .where(eq(products.organizationId, organizationId))
    .orderBy(asc(products.productId));
  if (rows.length === 0) return [];

  // One extra query rather than one per product, and rather than leaving the
  // list as the odd one out: a product's identifiers must look the same here as
  // they do on the detail route.
  const identifiers = await db
    .select({
      identifierType: productIdentifiers.identifierType,
      identifierValue: productIdentifiers.identifierValue,
      issuer: productIdentifiers.issuer,
      productId: productIdentifiers.productId,
    })
    .from(productIdentifiers)
    .where(
      inArray(
        productIdentifiers.productId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(productIdentifiers.identifierType));

  const byProduct = new Map<string, ProductIdentifier[]>();
  for (const { productId, ...identifier } of identifiers) {
    (byProduct.get(productId) ?? byProduct.set(productId, []).get(productId)!).push(identifier);
  }

  return rows.map((row) => ({ ...row, identifiers: byProduct.get(row.id) ?? [] }));
}

export type ProductIdentifier = {
  identifierType: ProductIdentifierType;
  identifierValue: string;
  issuer: string | null;
};

const productResponseColumns = {
  category: products.category,
  createdAt: products.createdAt,
  id: products.id,
  lifecycleStatus: products.lifecycleStatus,
  manufacturerProductId: products.manufacturerProductId,
  metadata: products.metadata,
  name: products.name,
  productId: products.productId,
  updatedAt: products.updatedAt,
};

export async function createProduct(
  db: Database,
  organizationId: string,
  input: CreateProductInput,
) {
  // One transaction: a product and its identifiers were written by two
  // unguarded statements before, so a failure between them left a product whose
  // identifiers were half-applied.
  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        organizationId,
        productId: input.productId,
        name: input.name,
        category: input.category,
        manufacturerProductId: input.manufacturerProductId,
        lifecycleStatus: input.lifecycleStatus,
        metadata: input.metadata,
      })
      .returning(productResponseColumns);

    if (!product) {
      throw new Error("Failed to create product");
    }

    await replaceProductIdentifiers(tx, product.id, input.identifiers);

    // Read back the way a GET does, so create and read cannot disagree about
    // what a product looks like.
    return { ...product, identifiers: await listProductIdentifiers(tx, product.id) };
  });
}

// A product's identifiers, replaced wholesale: the input is the complete set,
// so anything not in it is gone. Partial updates would need the caller to know
// which types already exist.
async function replaceProductIdentifiers(
  db: Database | Transaction,
  productId: string,
  identifiers: ProductIdentifierInput[] | undefined,
) {
  if (!identifiers) return;

  await db.delete(productIdentifiers).where(eq(productIdentifiers.productId, productId));
  if (identifiers.length === 0) return;

  // Two identical (type, value) pairs would violate the unique index - and turn
  // into a 500 for the caller instead of a message. The duplicate is harmless
  // (the same identifier named twice), so it is dropped here; two *different*
  // values of the same type are kept, since those are allowed.
  const seen = new Set<string>();
  const rows = identifiers.filter((identifier) => {
    const key = `${identifier.identifierType}\u0000${identifier.identifierValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await db.insert(productIdentifiers).values(
    rows.map((identifier) => ({
      productId,
      identifierType: identifier.identifierType,
      identifierValue: identifier.identifierValue,
      issuer: identifier.issuer,
    })),
  );
}

export async function listProductIdentifiers(db: Database | Transaction, productId: string) {
  // Explicit columns: a bare select() would carry the join table's own `id`,
  // `productId` and `createdAt` into the response — internal row structure a
  // caller has no use for and cannot rely on.
  return db
    .select({
      identifierType: productIdentifiers.identifierType,
      identifierValue: productIdentifiers.identifierValue,
      issuer: productIdentifiers.issuer,
    })
    .from(productIdentifiers)
    .where(eq(productIdentifiers.productId, productId))
    .orderBy(asc(productIdentifiers.identifierType));
}

export async function findProductWithIdentifiersByBusinessId(
  db: Database,
  organizationId: string,
  productId: string,
) {
  const [product] = await db
    .select(productResponseColumns)
    .from(products)
    .where(and(eq(products.organizationId, organizationId), eq(products.productId, productId)))
    .limit(1);
  if (!product) {
    return undefined;
  }

  return { ...product, identifiers: await listProductIdentifiers(db, product.id) };
}

export async function patchProductByBusinessId(
  db: Database,
  organizationId: string,
  productId: string,
  input: PatchProductInput,
) {
  const existing = await findProductByBusinessId(db, organizationId, productId);
  if (!existing) {
    return undefined;
  }

  const { identifiers, ...patch } = input;

  // Same reason as createProduct: the product row and its identifiers are one
  // change, and a failure in the middle must not leave half of it applied.
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(products)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(and(eq(products.organizationId, organizationId), eq(products.productId, productId)))
      .returning(productResponseColumns);

    if (!updated) {
      return undefined;
    }

    await replaceProductIdentifiers(tx, updated.id, identifiers);

    return { ...updated, identifiers: await listProductIdentifiers(tx, updated.id) };
  });
}

const facilityResponseColumns = {
  address: facilities.address,
  countryCode: facilities.countryCode,
  createdAt: facilities.createdAt,
  facilityId: facilities.facilityId,
  facilityType: facilities.facilityType,
  id: facilities.id,
  metadata: facilities.metadata,
  name: facilities.name,
  operatorId: facilities.operatorId,
  updatedAt: facilities.updatedAt,
};

export async function listFacilities(db: Database, organizationId: string) {
  return db
    .select(facilityResponseColumns)
    .from(facilities)
    .where(eq(facilities.organizationId, organizationId))
    .orderBy(asc(facilities.name));
}

export async function findFacilityByBusinessId(
  db: Database,
  organizationId: string,
  facilityId: string,
) {
  const [facility] = await db
    .select(facilityResponseColumns)
    .from(facilities)
    .where(
      and(eq(facilities.organizationId, organizationId), eq(facilities.facilityId, facilityId)),
    )
    .limit(1);

  return facility;
}

export async function createFacility(
  db: Database,
  organizationId: string,
  input: CreateFacilityInput,
) {
  const [facility] = await db
    .insert(facilities)
    .values({
      organizationId,
      facilityId: input.facilityId,
      name: input.name,
      facilityType: input.facilityType,
      operatorId: input.operatorId,
      countryCode: input.countryCode,
      address: input.address,
      metadata: input.metadata,
    })
    .returning(facilityResponseColumns);

  if (!facility) {
    throw new Error("Failed to create facility");
  }

  return facility;
}

export async function patchFacilityByBusinessId(
  db: Database,
  organizationId: string,
  facilityId: string,
  input: PatchFacilityInput,
) {
  const [facility] = await db
    .update(facilities)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(eq(facilities.organizationId, organizationId), eq(facilities.facilityId, facilityId)),
    )
    .returning(facilityResponseColumns);

  return facility;
}

export async function listEconomicOperators(db: Database, organizationId: string) {
  return db
    .select(economicOperatorResponseColumns)
    .from(economicOperators)
    .where(eq(economicOperators.organizationId, organizationId))
    .orderBy(asc(economicOperators.legalName));
}

export async function createEconomicOperator(
  db: Database,
  organizationId: string,
  input: CreateEconomicOperatorInput,
) {
  const [operator] = await db
    .insert(economicOperators)
    .values({
      organizationId,
      operatorId: input.operatorId,
      legalName: input.legalName,
      roles: input.roles,
      countryCode: input.countryCode,
      vatId: input.vatId,
      address: input.address,
      metadata: input.metadata,
    })
    .returning(economicOperatorResponseColumns);

  if (!operator) {
    throw new Error("Failed to create economic operator");
  }

  return operator;
}

export async function findEconomicOperatorByBusinessId(
  db: Database,
  organizationId: string,
  operatorId: string,
) {
  const [operator] = await db
    .select(economicOperatorResponseColumns)
    .from(economicOperators)
    .where(
      and(
        eq(economicOperators.organizationId, organizationId),
        eq(economicOperators.operatorId, operatorId),
      ),
    )
    .limit(1);

  return operator;
}

export async function patchEconomicOperatorByBusinessId(
  db: Database,
  organizationId: string,
  operatorId: string,
  input: PatchEconomicOperatorInput,
) {
  const [operator] = await db
    .update(economicOperators)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(economicOperators.organizationId, organizationId),
        eq(economicOperators.operatorId, operatorId),
      ),
    )
    .returning(economicOperatorResponseColumns);

  return operator;
}

export async function listDataDictionaryEntries(db: Database, organizationId: string) {
  return db
    .select(dictionaryEntryResponseColumns)
    .from(dataDictionaryEntries)
    .where(eq(dataDictionaryEntries.organizationId, organizationId))
    .orderBy(asc(dataDictionaryEntries.entryKey));
}

// Entries of exactly one dictionary version. `listDataDictionaryEntries` lists
// the whole tenant - the wrong question for "which data points does *this*
// dictionary have" now that an organization can hold several versions (G65).
export async function listDataDictionaryEntriesByRepositoryId(
  db: Database,
  organizationId: string,
  repositoryId: string,
) {
  return db
    .select(dictionaryEntryResponseColumns)
    .from(dataDictionaryEntries)
    .where(
      and(
        eq(dataDictionaryEntries.organizationId, organizationId),
        eq(dataDictionaryEntries.repositoryId, repositoryId),
      ),
    )
    .orderBy(asc(dataDictionaryEntries.entryKey));
}

export async function listDataDictionaryEntriesByRepositoryKey(
  db: Database,
  organizationId: string,
  repositoryKey: string,
) {
  const repository = await findDataDictionaryRepositoryByKey(db, organizationId, repositoryKey);
  if (!repository) {
    return undefined;
  }

  return db
    .select(dictionaryEntryResponseColumns)
    .from(dataDictionaryEntries)
    .where(
      and(
        eq(dataDictionaryEntries.organizationId, organizationId),
        eq(dataDictionaryEntries.repositoryId, repository.id),
      ),
    )
    .orderBy(asc(dataDictionaryEntries.entryKey));
}

export async function listPublicDataDictionaryEntriesByRepositoryKey(
  db: Database,
  repositoryKey: string,
) {
  const repository = await findPublicDataDictionaryRepositoryByKey(db, repositoryKey);
  if (!repository) {
    return undefined;
  }

  return db
    .select(dictionaryEntryResponseColumns)
    .from(dataDictionaryEntries)
    .where(
      and(
        eq(dataDictionaryEntries.repositoryId, repository.id),
        eq(dataDictionaryEntries.visibility, "public"),
      ),
    )
    .orderBy(asc(dataDictionaryEntries.entryKey));
}

export async function listDataDictionaryRepositories(db: Database, organizationId: string) {
  return db
    .select(dictionaryRepositoryResponseColumns)
    .from(dataDictionaryRepositories)
    .where(eq(dataDictionaryRepositories.organizationId, organizationId))
    .orderBy(asc(dataDictionaryRepositories.repositoryKey));
}

export async function patchDataDictionaryRepositoryByKey(
  db: Database,
  organizationId: string,
  repositoryKey: string,
  input: PatchDataDictionaryRepositoryInput,
) {
  const [repository] = await db
    .update(dataDictionaryRepositories)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(dataDictionaryRepositories.organizationId, organizationId),
        eq(dataDictionaryRepositories.repositoryKey, repositoryKey),
      ),
    )
    .returning();

  return repository;
}

export async function createDataDictionaryRepository(
  db: Database,
  organizationId: string,
  input: CreateDataDictionaryRepositoryInput,
) {
  const [repository] = await db
    .insert(dataDictionaryRepositories)
    .values({
      organizationId,
      repositoryKey: input.repositoryKey,
      name: input.name,
      namespaceUri: input.namespaceUri,
      version: input.version,
      publisher: input.publisher,
      status: input.status,
      metadata: input.metadata,
    })
    .returning(dictionaryRepositoryResponseColumns);

  if (!repository) {
    throw new Error("Failed to create data dictionary repository");
  }

  return repository;
}

export async function createDataDictionaryEntry(
  db: Database | Transaction,
  organizationId: string,
  input: CreateDataDictionaryEntryInput,
) {
  const repositoryId =
    input.repositoryId ??
    (input.repositoryKey
      ? (await findDataDictionaryRepositoryByKey(db, organizationId, input.repositoryKey))?.id
      : undefined);

  const [entry] = await db
    .insert(dataDictionaryEntries)
    .values({
      organizationId,
      repositoryId,
      entryKey: input.entryKey,
      externalId: input.externalId,
      canonicalUri: input.canonicalUri,
      version: input.version,
      name: input.name,
      description: input.description,
      valueType: input.valueType,
      unit: input.unit,
      required: input.required,
      visibility: input.visibility,
      standardReference: input.standardReference,
      allowedValues: input.allowedValues,
      validationRules: input.validationRules,
      metadata: input.metadata,
    })
    .returning(dictionaryEntryResponseColumns);

  if (!entry) {
    throw new Error("Failed to create data dictionary entry");
  }

  return entry;
}

// Addressing an entry by (organization, entryKey) stopped identifying a single
// row when G65 dropped that index's uniqueness: an entryKey now exists once per
// version of its dictionary, and two dictionaries may share one. Use
// findDataDictionaryEntryInRepository instead — this one only survives for the
// legacy flat routes and picks an arbitrary match.
//
// @deprecated Ambiguous. Address entries through their dictionary version.
export async function findAnyDataDictionaryEntryByKey(
  db: Database,
  organizationId: string,
  entryKey: string,
) {
  const [entry] = await db
    .select(dictionaryEntryResponseColumns)
    .from(dataDictionaryEntries)
    .where(
      and(
        eq(dataDictionaryEntries.organizationId, organizationId),
        eq(dataDictionaryEntries.entryKey, entryKey),
      ),
    )
    .limit(1);

  return entry;
}

export async function patchDataDictionaryEntryByKey(
  db: Database,
  organizationId: string,
  entryKey: string,
  input: PatchDataDictionaryEntryInput,
) {
  const repositoryId =
    input.repositoryId ??
    (input.repositoryKey
      ? (await findDataDictionaryRepositoryByKey(db, organizationId, input.repositoryKey))?.id
      : undefined);
  const { repositoryKey: _repositoryKey, ...patch } = input;

  const [entry] = await db
    .update(dataDictionaryEntries)
    .set({
      ...patch,
      ...(repositoryId ? { repositoryId } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dataDictionaryEntries.organizationId, organizationId),
        eq(dataDictionaryEntries.entryKey, entryKey),
      ),
    )
    .returning();

  return entry;
}

// Resolves a repositoryKey to a single version. Several versions of one key can
// coexist since G65, so "the" repository is the newest one — picked by the label
// scheme rather than by text order, where 2026.10 would lose against 2026.2.
export async function findDataDictionaryRepositoryByKey(
  db: Database | Transaction,
  organizationId: string,
  repositoryKey: string,
  version?: string,
) {
  const repositories = await db
    .select(dictionaryRepositoryResponseColumns)
    .from(dataDictionaryRepositories)
    .where(
      and(
        eq(dataDictionaryRepositories.organizationId, organizationId),
        eq(dataDictionaryRepositories.repositoryKey, repositoryKey),
        ...(version ? [eq(dataDictionaryRepositories.version, version)] : []),
      ),
    );

  const latest = latestVersionLabel(repositories.map((repository) => repository.version));

  return repositories.find((repository) => repository.version === latest) ?? repositories[0];
}

// Public dictionary lookup: newest active version of the key (see
// findDataDictionaryRepositoryByKey on why the pick is not a plain LIMIT 1).
export async function findPublicDataDictionaryRepositoryByKey(
  db: Database,
  repositoryKey: string,
  version?: string,
) {
  const repositories = await db
    .select(dictionaryRepositoryResponseColumns)
    .from(dataDictionaryRepositories)
    .where(
      and(
        eq(dataDictionaryRepositories.repositoryKey, repositoryKey),
        eq(dataDictionaryRepositories.status, "active"),
        ...(version ? [eq(dataDictionaryRepositories.version, version)] : []),
      ),
    );

  const latest = latestVersionLabel(repositories.map((repository) => repository.version));

  return repositories.find((repository) => repository.version === latest) ?? repositories[0];
}

export async function findProductByBusinessId(
  db: Database,
  organizationId: string,
  productId: string,
) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.organizationId, organizationId), eq(products.productId, productId)))
    .limit(1);

  return product;
}

// --- G65: immutable dictionary versions -------------------------------------
//
// A published DPP pins a dictionary version through
// dppSchemaVersion = "{repositoryKey}/{version}", and both the public viewer and
// the publish validator read the entries live. Editing a pinned version would
// therefore silently change what an already published passport shows. The rule:
// a pinned version is copied to a new one and the edit lands in the copy; an
// unpinned version is edited in place (so a fresh version does not sprawl into
// 2026.3, 2026.4 … while it is still being worked on).

export async function listDataDictionaryRepositoriesByKey(
  db: Database,
  organizationId: string,
  repositoryKey: string,
) {
  return db
    .select(dictionaryRepositoryResponseColumns)
    .from(dataDictionaryRepositories)
    .where(
      and(
        eq(dataDictionaryRepositories.organizationId, organizationId),
        eq(dataDictionaryRepositories.repositoryKey, repositoryKey),
      ),
    );
}

// Number of DPPs that pin this dictionary version through a published version.
// Archived DPPs do not count: they are off the public surface, so their pin no
// longer freezes anything.
export async function countPublishedDppsForDictionaryVersion(
  db: Database,
  organizationId: string,
  repositoryKey: string,
  version: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(dpps)
    .where(
      and(
        eq(dpps.organizationId, organizationId),
        eq(dpps.dppSchemaVersion, `${repositoryKey}/${version}`),
        ne(dpps.status, "archived"),
        or(isNotNull(dpps.activeVersionId), eq(dpps.status, "published")),
      ),
    );

  return row?.value ?? 0;
}

// Copies a dictionary version and all its entries to `nextVersion`, leaving the
// source untouched. Returns the new repository row.
export async function forkDataDictionaryVersion(
  db: Database,
  organizationId: string,
  repositoryId: string,
  nextVersion: string,
) {
  return db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(dataDictionaryRepositories)
      .where(
        and(
          eq(dataDictionaryRepositories.id, repositoryId),
          eq(dataDictionaryRepositories.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!source) return undefined;

    const [forked] = await tx
      .insert(dataDictionaryRepositories)
      .values({
        organizationId,
        repositoryKey: source.repositoryKey,
        name: source.name,
        // The namespace URI conventionally embeds the version; keep the two in
        // step rather than publishing 2026.2 under a .../2026.1/ namespace.
        namespaceUri: source.namespaceUri.split(source.version).join(nextVersion),
        version: nextVersion,
        publisher: source.publisher,
        status: source.status,
        metadata: source.metadata,
      })
      .returning();
    if (!forked) throw new Error("Failed to fork data dictionary version");

    const entries = await tx
      .select()
      .from(dataDictionaryEntries)
      .where(eq(dataDictionaryEntries.repositoryId, repositoryId));

    if (entries.length > 0) {
      await tx.insert(dataDictionaryEntries).values(
        entries.map((entry) => ({
          organizationId: entry.organizationId,
          repositoryId: forked.id,
          entryKey: entry.entryKey,
          externalId: entry.externalId,
          canonicalUri: entry.canonicalUri,
          version: nextVersion,
          name: entry.name,
          description: entry.description,
          valueType: entry.valueType,
          unit: entry.unit,
          required: entry.required,
          visibility: entry.visibility,
          standardReference: entry.standardReference,
          allowedValues: entry.allowedValues,
          validationRules: entry.validationRules,
          metadata: entry.metadata,
        })),
      );
    }

    return forked;
  });
}

// Entry lookup scoped to one dictionary version. The organization-wide lookup
// cannot be used any more: the same entryKey now exists once per version.
export async function findDataDictionaryEntryInRepository(
  db: Database,
  repositoryId: string,
  entryKey: string,
) {
  const [entry] = await db
    .select(dictionaryEntryResponseColumns)
    .from(dataDictionaryEntries)
    .where(
      and(
        eq(dataDictionaryEntries.repositoryId, repositoryId),
        eq(dataDictionaryEntries.entryKey, entryKey),
      ),
    )
    .limit(1);

  return entry;
}

export async function patchDataDictionaryEntryInRepository(
  db: Database,
  repositoryId: string,
  entryKey: string,
  input: Omit<PatchDataDictionaryEntryInput, "repositoryId" | "repositoryKey">,
) {
  const [entry] = await db
    .update(dataDictionaryEntries)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(dataDictionaryEntries.repositoryId, repositoryId),
        eq(dataDictionaryEntries.entryKey, entryKey),
      ),
    )
    .returning(dictionaryEntryResponseColumns);

  return entry;
}

export async function patchDataDictionaryRepositoryById(
  db: Database | Transaction,
  organizationId: string,
  repositoryId: string,
  input: PatchDataDictionaryRepositoryInput,
) {
  const [repository] = await db
    .update(dataDictionaryRepositories)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(dataDictionaryRepositories.id, repositoryId),
        eq(dataDictionaryRepositories.organizationId, organizationId),
      ),
    )
    .returning(dictionaryRepositoryResponseColumns);

  return repository;
}

// Entries of one exact dictionary version, addressed the way a DPP pins it:
// dppSchemaVersion = "{repositoryKey}/{version}". Necessary since a version fork
// duplicates every entryKey within the organization — an organization-wide entry
// list would let a newer version's labels bleed into a passport pinned to an
// older one.
export async function listDataDictionaryEntriesForBinding(
  db: Database,
  organizationId: string,
  dppSchemaVersion: string,
) {
  const separator = dppSchemaVersion.lastIndexOf("/");
  if (separator <= 0) return undefined;

  const repositoryKey = dppSchemaVersion.slice(0, separator);
  const version = dppSchemaVersion.slice(separator + 1);

  const [repository] = await db
    .select({ id: dataDictionaryRepositories.id })
    .from(dataDictionaryRepositories)
    .where(
      and(
        eq(dataDictionaryRepositories.organizationId, organizationId),
        eq(dataDictionaryRepositories.repositoryKey, repositoryKey),
        eq(dataDictionaryRepositories.version, version),
      ),
    )
    .limit(1);
  if (!repository) return undefined;

  return db
    .select(dictionaryEntryResponseColumns)
    .from(dataDictionaryEntries)
    .where(eq(dataDictionaryEntries.repositoryId, repository.id))
    .orderBy(asc(dataDictionaryEntries.entryKey));
}
