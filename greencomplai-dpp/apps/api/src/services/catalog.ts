import {
  countPublishedDppsForDictionaryVersion,
  createDataDictionaryEntry,
  listDataDictionaryEntriesByRepositoryId,
  createDataDictionaryRepository,
  createEconomicOperator,
  createProduct,
  findDataDictionaryEntryInRepository,
  findDataDictionaryRepositoryByKey,
  createFacility,
  findEconomicOperatorByBusinessId,
  findFacilityByBusinessId,
  listFacilities,
  patchFacilityByBusinessId,
  findProductWithIdentifiersByBusinessId,
  forkDataDictionaryVersion,
  listDataDictionaryEntriesByRepositoryKey,
  listDataDictionaryRepositories,
  listDataDictionaryRepositoriesByKey,
  listEconomicOperators,
  listProductIdentifiers,
  listProducts,
  patchDataDictionaryEntryInRepository,
  patchDataDictionaryRepositoryById,
  patchEconomicOperatorByBusinessId,
  patchProductByBusinessId,
} from "@dpp/db";
import { latestVersionLabel, nextVersionLabel } from "@dpp/domain";
import type {
  CreateDataDictionaryEntryInput,
  CreateDataDictionaryRepositoryInput,
  CreateEconomicOperatorInput,
  CreateFacilityInput,
  CreateProductInput,
  PatchDataDictionaryEntryInput,
  PatchDataDictionaryRepositoryInput,
  PatchEconomicOperatorInput,
  PatchFacilityInput,
  PatchProductInput,
} from "@dpp/schemas";

import { db } from "../db.js";
import { ESRS_PROFILES, findEsrsProfile, readEnabledProfiles } from "@dpp/domain";

type CatalogResult<T> =
  | { ok: true; value: T }
  | {
      code: string;
      message: string;
      ok: false;
      status: 404 | 422;
      // As with passports : one message per violated reference, so a
      // rejection points at the field that caused it.
      issues?: { path?: string; text: string }[];
    };

export async function getProducts(organizationId: string) {
  return listProducts(db, organizationId);
}

export async function getProduct(organizationId: string, productId: string) {
  return found(
    await findProductWithIdentifiersByBusinessId(db, organizationId, productId),
    "PRODUCT_NOT_FOUND",
    "Product not found",
  );
}

export async function registerProduct(organizationId: string, input: CreateProductInput) {
  return createProduct(db, organizationId, input);
}

export async function updateProduct(
  organizationId: string,
  productId: string,
  input: PatchProductInput,
) {
  return found(
    await patchProductByBusinessId(db, organizationId, productId, input),
    "PRODUCT_NOT_FOUND",
    "Product not found",
  );
}

export async function getProductIdentifiers(productId: string) {
  return listProductIdentifiers(db, productId);
}

export async function getEconomicOperators(organizationId: string) {
  return listEconomicOperators(db, organizationId);
}

export async function getEconomicOperator(organizationId: string, operatorId: string) {
  return found(
    await findEconomicOperatorByBusinessId(db, organizationId, operatorId),
    "ECONOMIC_OPERATOR_NOT_FOUND",
    "Economic operator not found",
  );
}

export async function registerEconomicOperator(
  organizationId: string,
  input: CreateEconomicOperatorInput,
) {
  return createEconomicOperator(db, organizationId, input);
}

export async function updateEconomicOperator(
  organizationId: string,
  operatorId: string,
  input: PatchEconomicOperatorInput,
) {
  return found(
    await patchEconomicOperatorByBusinessId(db, organizationId, operatorId, input),
    "ECONOMIC_OPERATOR_NOT_FOUND",
    "Economic operator not found",
  );
}

export async function getFacilities(organizationId: string) {
  return listFacilities(db, organizationId);
}

export async function getFacility(organizationId: string, facilityId: string) {
  return found(
    await findFacilityByBusinessId(db, organizationId, facilityId),
    "FACILITY_NOT_FOUND",
    "Facility not found",
  );
}

// The operating economic operator is optional - but if named, it must exist
// in this tenant. Same rule as on the passport : a reference that only
// surfaces on read sits in the data until then.
async function assertOperatorResolves(
  organizationId: string,
  operatorId: string | undefined,
): Promise<CatalogResult<never> | null> {
  if (!operatorId) return null;
  if (await findEconomicOperatorByBusinessId(db, organizationId, operatorId)) return null;

  return {
    code: "FACILITY_REFERENCE_NOT_FOUND",
    message: `Wirtschaftsakteur „${operatorId}" existiert in dieser Organisation nicht`,
    ok: false,
    status: 422,
    issues: [
      {
        path: "operatorId",
        text: `Wirtschaftsakteur „${operatorId}" existiert in dieser Organisation nicht`,
      },
    ],
  };
}

export async function registerFacility(
  organizationId: string,
  input: CreateFacilityInput,
): Promise<CatalogResult<Awaited<ReturnType<typeof createFacility>>>> {
  const referenceError = await assertOperatorResolves(organizationId, input.operatorId);
  if (referenceError) return referenceError;

  return { ok: true, value: await createFacility(db, organizationId, input) };
}

export async function updateFacility(
  organizationId: string,
  facilityId: string,
  input: PatchFacilityInput,
) {
  const referenceError = await assertOperatorResolves(organizationId, input.operatorId);
  if (referenceError) return referenceError;

  return found(
    await patchFacilityByBusinessId(db, organizationId, facilityId, input),
    "FACILITY_NOT_FOUND",
    "Facility not found",
  );
}

// --- ESRS requirement profiles on the dictionary ( mechanism for ESRS) --
//
// Checking a requirement writes its category and mandatory datapoints into
// the dictionary. Four rules behind that:
//
// 1. Idempotent. Detected via `canonicalUri`, not the entry key: a datapoint
// that already exists is neither duplicated nor overwritten, so a user who
// renamed a field or changed its unit doesn't lose that on re-checking.
//
// 2. Unchecking removes the requirement, not the data. Entries stay; they may
// already carry values in passports, and deleting them would destroy
// passport data because someone unchecked a box.
//
// 3. Immutable versions apply here too. Writes go through the same path as
// any other dictionary change (`resolveWritableDictionaryVersion`): a version
// pinned by published passports is copied, and the change lands in the copy.
//
// 4. The catalog is system-owned. The tenant chooses *whether* a requirement
// applies - never *what* it contains.
export async function getDictionaryEsrsProfiles(
  organizationId: string,
  repositoryKey: string,
): Promise<
  CatalogResult<{ enabled: string[]; profiles: typeof ESRS_PROFILES; repositoryVersion: string }>
> {
  const repository = await findLatestDictionaryVersion(organizationId, repositoryKey);
  if (!repository) {
    return {
      code: "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      message: "Data dictionary repository not found",
      ok: false,
      status: 404,
    };
  }

  return {
    ok: true,
    value: {
      enabled: readEnabledProfiles(repository.metadata),
      profiles: ESRS_PROFILES,
      repositoryVersion: repository.version,
    },
  };
}

export type EsrsProfileApplication = {
  // An entry that already exists under this key in the dictionary but means
  // something else. It is left untouched - imposing the ESRS meaning on it
  // would silently reinterpret someone else's data. The `esrs` prefix on
  // profile keys makes this a rare case (someone named their own field
  // exactly that), but it is still reported.
  conflicts: { canonicalUri: string; entryKey: string; existingCanonicalUri: string | null }[];
  created: string[];
  enabled: string[];
  existing: string[];
  // Set when the version was pinned and therefore copied .
  forkedTo?: string | undefined;
};

export async function setDictionaryEsrsProfiles(
  organizationId: string,
  repositoryKey: string,
  profileKeys: string[],
): Promise<CatalogResult<EsrsProfileApplication>> {
  const repository = await findLatestDictionaryVersion(organizationId, repositoryKey);
  if (!repository) {
    return {
      code: "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      message: "Data dictionary repository not found",
      ok: false,
      status: 404,
    };
  }

  const unknown = profileKeys.filter((key) => !findEsrsProfile(key));
  if (unknown.length > 0) {
    return {
      code: "ESRS_PROFILE_UNKNOWN",
      message: `Unknown ESRS profile(s): ${unknown.join(", ")}`,
      ok: false,
      status: 422,
    };
  }

  const target = await resolveWritableDictionaryVersion(organizationId, repository);
  if (!target.ok) return target;

  const profiles = profileKeys.map((key) => findEsrsProfile(key)!);
  const entries = await listDataDictionaryEntriesByRepositoryId(
    db,
    organizationId,
    target.repositoryId,
  );
  const existingUris = new Set(
    entries.map((entry) => entry.canonicalUri).filter((uri): uri is string => Boolean(uri)),
  );

  // The entry key is unique per dictionary. Without this check, creation hit
  // the unique index as soon as a tenant had already named a field that way,
  // and the whole selection failed on a single name. The prefix prevents the
  // common case, this check catches the rest.
  const entryKeys = new Map(entries.map((entry) => [entry.entryKey, entry.canonicalUri ?? null]));

  const conflicts: EsrsProfileApplication["conflicts"] = [];
  const created: string[] = [];
  const existing: string[] = [];

  // All or nothing. An error mid-loop would otherwise leave a half-applied
  // profile: some datapoints created, but the category and selection not
  // saved - the user sees an error and the dictionary still has new fields.
  await db.transaction(async (tx) => {
    for (const profile of profiles) {
      for (const datapoint of profile.datapoints) {
        if (existingUris.has(datapoint.canonicalUri)) {
          existing.push(datapoint.canonicalUri);
          continue;
        }

        if (entryKeys.has(datapoint.entryKey)) {
          conflicts.push({
            canonicalUri: datapoint.canonicalUri,
            entryKey: datapoint.entryKey,
            existingCanonicalUri: entryKeys.get(datapoint.entryKey) ?? null,
          });
          continue;
        }

        await createDataDictionaryEntry(tx, organizationId, {
          repositoryId: target.repositoryId,
          entryKey: datapoint.entryKey,
          canonicalUri: datapoint.canonicalUri,
          name: { de: datapoint.name },
          description: { de: datapoint.description },
          valueType: datapoint.valueType,
          unit: datapoint.unit,
          required: datapoint.required,
          visibility: datapoint.visibility,
          standardReference: `ESRS ${profile.standard}`,
          // The category the editor turns into a collection. The name is a
          // translation object because the UI reads it that way - a plain
          // string showed only the first character.
          metadata: {
            category: {
              description: profile.category.description,
              id: profile.category.id,
              name: { de: profile.category.name },
            },
          },
        });
        existingUris.add(datapoint.canonicalUri);
        entryKeys.set(datapoint.entryKey, datapoint.canonicalUri);
        created.push(datapoint.canonicalUri);
      }
    }

    // The selection and its categories are stored in the dictionary's metadata.
    const metadata = (repository.metadata ?? {}) as Record<string, unknown>;
    const categories = Array.isArray(metadata.categories) ? metadata.categories : [];
    const categoryIds = new Set(
      categories.map((category) => (category as { id?: string }).id).filter(Boolean),
    );
    const addedCategories = profiles
      .map((profile) => profile.category)
      .filter((category) => !categoryIds.has(category.id))
      .map((category) => ({
        description: category.description,
        id: category.id,
        name: { de: category.name },
      }));

    await patchDataDictionaryRepositoryById(tx, organizationId, target.repositoryId, {
      metadata: {
        ...metadata,
        categories: [...categories, ...addedCategories],
        esrsProfiles: profileKeys,
      },
    } as PatchDataDictionaryRepositoryInput);
  });

  return {
    ok: true,
    value: {
      conflicts,
      created,
      enabled: profileKeys,
      existing,
      forkedTo: target.forkedTo,
    },
  };
}

// Reads an entry through its dictionary. `version` picks an exact version;
// without it the newest one answers, which is what an editor is looking at.
export async function getDataDictionaryEntry(
  organizationId: string,
  repositoryKey: string,
  entryKey: string,
  version?: string,
) {
  const repository = version
    ? await findDataDictionaryRepositoryByKey(db, organizationId, repositoryKey, version)
    : await findLatestDictionaryVersion(organizationId, repositoryKey);
  if (!repository) {
    return found(
      undefined,
      "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      "Data dictionary repository not found",
    );
  }

  return found(
    await findDataDictionaryEntryInRepository(db, repository.id, entryKey),
    "DATA_DICTIONARY_ENTRY_NOT_FOUND",
    "Data dictionary entry not found",
  );
}

export async function getDataDictionaryEntriesForRepository(
  organizationId: string,
  repositoryKey: string,
) {
  return found(
    await listDataDictionaryEntriesByRepositoryKey(db, organizationId, repositoryKey),
    "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
    "Data dictionary repository not found",
  );
}

export async function getDataDictionaryRepositories(organizationId: string) {
  return listDataDictionaryRepositories(db, organizationId);
}

export async function getDataDictionaryRepository(organizationId: string, repositoryKey: string) {
  return found(
    await findDataDictionaryRepositoryByKey(db, organizationId, repositoryKey),
    "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
    "Data dictionary repository not found",
  );
}

export async function registerDataDictionaryRepository(
  organizationId: string,
  input: CreateDataDictionaryRepositoryInput,
) {
  return createDataDictionaryRepository(db, organizationId, input);
}

// Resolves the dictionary version a write should land in (G65). A version that
// published DPPs pin is immutable: it is copied to the next version and the
// caller edits the copy. An unpinned version is returned as-is, so successive
// edits to a not-yet-published version keep landing in it instead of minting
// 2026.3, 2026.4 … for every keystroke.
async function resolveWritableDictionaryVersion(
  organizationId: string,
  repository: { id: string; repositoryKey: string; version: string },
): Promise<
  | { ok: true; forkedTo?: string; repositoryId: string }
  | { code: string; message: string; ok: false; status: 404 }
> {
  const pinnedBy = await countPublishedDppsForDictionaryVersion(
    db,
    organizationId,
    repository.repositoryKey,
    repository.version,
  );
  if (pinnedBy === 0) return { ok: true, repositoryId: repository.id };

  const siblings = await listDataDictionaryRepositoriesByKey(
    db,
    organizationId,
    repository.repositoryKey,
  );
  const nextVersion = nextVersionLabel(
    siblings.map((sibling) => sibling.version),
    new Date(),
  );

  const forked = await forkDataDictionaryVersion(db, organizationId, repository.id, nextVersion);
  if (!forked) {
    return {
      code: "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      message: "Data dictionary repository not found",
      ok: false,
      status: 404,
    };
  }

  return { ok: true, forkedTo: forked.version, repositoryId: forked.id };
}

// The dictionary version an editor works on: the newest one of that key.
async function findLatestDictionaryVersion(organizationId: string, repositoryKey: string) {
  const versions = await listDataDictionaryRepositoriesByKey(db, organizationId, repositoryKey);
  const latest = latestVersionLabel(versions.map((version) => version.version));

  return versions.find((version) => version.version === latest);
}

export async function updateDataDictionaryRepository(
  organizationId: string,
  repositoryKey: string,
  input: PatchDataDictionaryRepositoryInput,
) {
  const repository = await findLatestDictionaryVersion(organizationId, repositoryKey);
  if (!repository) {
    return {
      code: "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      message: "Data dictionary repository not found",
      ok: false,
      status: 404,
    } as const;
  }

  const target = await resolveWritableDictionaryVersion(organizationId, repository);
  if (!target.ok) return target;

  return found(
    await patchDataDictionaryRepositoryById(db, organizationId, target.repositoryId, input),
    "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
    "Data dictionary repository not found",
  );
}

// Both writes take the dictionary from the caller rather than looking it up from
// the entry key: the key alone no longer identifies one entry (G65), so deriving
// the dictionary from it would mean guessing which one the caller meant.
export async function registerDataDictionaryEntry(
  organizationId: string,
  repositoryKey: string,
  input: Omit<CreateDataDictionaryEntryInput, "repositoryId" | "repositoryKey">,
) {
  // Adding an entry changes the dictionary as much as editing one does — a new
  // required field would retroactively invalidate published passports.
  const repository = await findLatestDictionaryVersion(organizationId, repositoryKey);
  if (!repository) {
    return found(
      undefined,
      "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      "Data dictionary repository not found",
    );
  }

  const target = await resolveWritableDictionaryVersion(organizationId, repository);
  if (!target.ok) return target;

  return {
    ok: true,
    value: await createDataDictionaryEntry(db, organizationId, {
      ...input,
      repositoryId: target.repositoryId,
    }),
  } as const;
}

// Several entries at once, into the same dictionary version.
//
// Not a loop over `registerDataDictionaryEntry` at the call site: that would
// resolve - and possibly fork - the writable version once per entry, and a
// failure halfway through would leave a dictionary that holds some of what was
// confirmed. A set of entries drafted together is one change to the vocabulary,
// so it lands as one.
//
// A `canonicalUri` is derived from the version actually written to, not from the
// one the caller saw: copy-on-write moves the entries into a new version whose
// namespace carries that version, and a URI naming the old one would point at a
// dictionary the entry does not live in.
//
// An entry key the dictionary already holds is not created a second time - but
// it is reported **with the reference and metadata of the entry that is there**.
// The caller asked "give me these entries"; that one already exists is a fact
// about the dictionary, not a reason to hand back nothing. Returning only a
// reason would leave the caller unable to point at the very entry it asked for.
export async function registerDataDictionaryEntries(
  organizationId: string,
  repositoryKey: string,
  entries: readonly Omit<CreateDataDictionaryEntryInput, "repositoryId" | "repositoryKey">[],
): Promise<
  CatalogResult<{
    created: RegisteredDictionaryEntry[];
    existing: RegisteredDictionaryEntry[];
    repositoryKey: string;
    version: string;
  }>
> {
  const repository = await findLatestDictionaryVersion(organizationId, repositoryKey);
  if (!repository) {
    return {
      code: "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      message: "Data dictionary repository not found",
      ok: false,
      status: 404,
    };
  }

  const target = await resolveWritableDictionaryVersion(organizationId, repository);
  if (!target.ok) return target;

  const written =
    (await listDataDictionaryRepositoriesByKey(db, organizationId, repositoryKey)).find(
      (sibling) => sibling.id === target.repositoryId,
    ) ?? repository;

  const present = await listDataDictionaryEntriesByRepositoryId(
    db,
    organizationId,
    target.repositoryId,
  );
  const byKey = new Map(present.map((entry) => [entry.entryKey, entry]));

  const created: RegisteredDictionaryEntry[] = [];
  const existing: RegisteredDictionaryEntry[] = [];

  await db.transaction(async (tx) => {
    for (const entry of entries) {
      // An entry key exists once per dictionary version. Hitting the unique
      // index would fail the whole set over one name someone already used - and
      // the name they used is the answer, not an error.
      const already = byKey.get(entry.entryKey);
      if (already) {
        existing.push({
          // `entryKey` as the fallback: a reference resolves against the
          // canonical URI, the key or the external id, so an entry without a
          // URI is still addressable.
          canonicalUri: already.canonicalUri ?? already.entryKey,
          entryKey: already.entryKey,
          metadata: already.metadata,
        });
        continue;
      }

      const canonicalUri =
        entry.canonicalUri ?? `${withSlash(written.namespaceUri)}${entry.entryKey}`;

      const row = await createDataDictionaryEntry(tx, organizationId, {
        ...entry,
        canonicalUri,
        repositoryId: target.repositoryId,
      });
      // Guards the rest of this batch: a caller that sent the same key twice
      // would otherwise hit the unique index on the second one.
      byKey.set(entry.entryKey, row);
      created.push({ canonicalUri, entryKey: entry.entryKey, metadata: row.metadata });
    }
  });

  return { ok: true, value: { created, existing, repositoryKey, version: written.version } };
}

// What a registration says about one entry, whether it was written now or was
// already there. `metadata` travels along because the parent category lives in
// it, and a caller placing an element needs the category of the entry that
// actually exists - not the one it proposed.
export type RegisteredDictionaryEntry = {
  canonicalUri: string;
  entryKey: string;
  metadata: unknown;
};

function withSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export async function updateDataDictionaryEntry(
  organizationId: string,
  repositoryKey: string,
  entryKey: string,
  input: PatchDataDictionaryEntryInput,
) {
  const repository = await findLatestDictionaryVersion(organizationId, repositoryKey);
  if (!repository) {
    return found(
      undefined,
      "DATA_DICTIONARY_REPOSITORY_NOT_FOUND",
      "Data dictionary repository not found",
    );
  }

  // The entry must exist in *this* dictionary; otherwise the copy-on-write below
  // would fork a version just to fail, or worse, silently create nothing.
  const existing = await findDataDictionaryEntryInRepository(db, repository.id, entryKey);
  if (!existing) {
    return found(undefined, "DATA_DICTIONARY_ENTRY_NOT_FOUND", "Data dictionary entry not found");
  }

  const target = await resolveWritableDictionaryVersion(organizationId, repository);
  if (!target.ok) return target;

  const { repositoryId: _repositoryId, repositoryKey: _repositoryKey, ...patch } = input;

  return found(
    await patchDataDictionaryEntryInRepository(db, target.repositoryId, entryKey, patch),
    "DATA_DICTIONARY_ENTRY_NOT_FOUND",
    "Data dictionary entry not found",
  );
}

function found<T>(value: T | undefined, code: string, message: string): CatalogResult<T> {
  if (!value) {
    return { code, message, ok: false, status: 404 };
  }

  return { ok: true, value };
}
