import { randomUUID } from "node:crypto";

import {
  applyMergePatch,
  canTransitionDppStatus,
  compareVersionLabels,
  diffDictionaryVersions,
  isEmptyUpgrade,
  type DictionaryUpgradeDiff,
  collectDocumentReferences,
  findCollection,
  findElementByPath,
  replaceCollection,
  replaceElementAtPath,
  diffDppSnapshots,
  filterSnapshotForRole,
  findElementSecurityViolations,
  findWriteViolations,
  reconcilePatchForRole,
  validateSnapshotAgainstDictionary,
  validateSnapshotForPublish,
  type DataElement,
  type DataElementCollection,
  type DppFieldDiff,
  type DppSnapshot,
  type DppStatus,
  type OrganizationRole,
  type ValidationReport,
} from "@dpp/domain";
import {
  createDppRecord,
  createDppRelationship,
  createDppRevisionRecord,
  deleteDppRelationship,
  deleteDraftDppRecord,
  findPublishedVersionAtDate,
  findDppByDigitalId,
  findEconomicOperatorByBusinessId,
  findFacilityByBusinessId,
  findPublishedVersionLabel,
  listOwnBlobIds,
  isDppVersionLabelTaken,
  getDppVersionSnapshot,
  listDataDictionaryEntriesByRepositoryId,
  listDataDictionaryEntriesForBinding,
  listDataDictionaryRepositories,
  listDataDictionaryRepositoriesByKey,
  listDppAuditEvents,
  listDppIdsByProductIds,
  listDppRecords,
  listDppRelationships,
  listDppVersions,
  listDppVersionsWithSnapshots,
  patchDppRecord,
  recordDppAccess,
  transitionDppRecordStatus,
} from "@dpp/db";
import type { CreateDppInput, CreateDppRelationshipInput, PatchDppInput } from "@dpp/schemas";

import { db } from "../db.js";
import { isUniqueViolation } from "../db-errors.js";
import { demoPublicId, getDemoDppPayload } from "./demo.js";
import { entitlements } from "./entitlements.js";

const now = () => new Date().toISOString();

export type ServiceResult<T> =
  | { ok: true; value: T }
  | {
      code: string;
      message: string;
      ok: false;
      status: 402 | 403 | 404 | 409 | 422;
      // Per-field messages for rejections that touch several fields (one
      // per unresolvable reference). Without them the caller would only get a
      // combined message it would have to split apart again.
      issues?: { path?: string; text: string }[];
    };

type DppViewPayload = {
  dictionaryEntries: unknown[];
  dictionaryRepositories: unknown[];
  dpp: DppSnapshot;
  // Short URL/QR handle for this DPP. The canonical identifier stays the URN in
  // dpp.digitalProductPassportId; this only drives routing.
  publicId: string;
  // Label of the open revision .
  versionLabel: string;
  // Label of the version that is currently published, if any. Independent of
  // versionLabel: a DPP can be `draft` on 2026.2 while 2026.1 stays published.
  publishedVersionLabel?: string | undefined;
  relationships: unknown[];
  // True when the DPP has an active published version and is therefore publicly
  // reachable - independent of the current working status (a DPP under revision
  // is still public via its last published version).
  hasPublicVersion: boolean;
};

export async function getDppSnapshot(
  organizationId: string,
  dppId: string,
  role: OrganizationRole,
  actorUserId: string,
): Promise<ServiceResult<DppSnapshot>> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) {
    return notFound("DPP_NOT_FOUND", "DPP not found");
  }

  await recordDppAccess(db, {
    organizationId,
    dppId: dpp.id,
    actorUserId,
    digitalProductPassportId: dpp.digitalProductPassportId,
  });

  return { ok: true, value: filterSnapshotForRole(dpp.currentSnapshot as DppSnapshot, role) };
}

export async function getDppView(
  organizationId: string,
  dppId: string,
  role: OrganizationRole,
  actorUserId: string,
): Promise<ServiceResult<DppViewPayload>> {
  if (organizationId === "demo-org") {
    const demo = getDemoDppPayload(dppId);
    return {
      ok: true,
      value: {
        ...demo,
        dpp: filterSnapshotForRole(demo.dpp, role),
        publicId: demoPublicId(demo.dpp.digitalProductPassportId),
        versionLabel: "2026.1",
        publishedVersionLabel: demo.dpp.status === "published" ? "2026.1" : undefined,
        hasPublicVersion: demo.dpp.status === "published",
      },
    };
  }

  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) {
    return notFound("DPP_NOT_FOUND", "DPP not found");
  }

  const snapshot = dpp.currentSnapshot as DppSnapshot;
  const [relationships, boundEntries, dictionaryRepositories, publishedVersionLabel] =
    await Promise.all([
      listDppRelationships(db, organizationId, dppId),
      // Scoped to the exact dictionary version this DPP pins: since lets an
      // organization hold several versions of one dictionary, the same entryKey
      // exists more than once and an unscoped list would resolve a passport's
      // labels against the wrong version.
      listDataDictionaryEntriesForBinding(db, organizationId, snapshot.dppSchemaVersion),
      listDataDictionaryRepositories(db, organizationId),
      findPublishedVersionLabel(db, dpp.activeVersionId),
    ]);
  // A DPP whose binding names no known dictionary version resolves against
  // nothing rather than against an arbitrary version's entries.
  const dictionaryEntries = boundEntries ?? [];

  await recordDppAccess(db, {
    organizationId,
    dppId: dpp.id,
    actorUserId,
    digitalProductPassportId: dpp.digitalProductPassportId,
  });

  return {
    ok: true,
    value: {
      dpp: filterSnapshotForRole(snapshot, role),
      dictionaryEntries,
      dictionaryRepositories,
      publicId: dpp.publicId,
      versionLabel: dpp.versionLabel,
      publishedVersionLabel,
      relationships: relationships ?? [],
      hasPublicVersion: Boolean(dpp.activeVersionId) || dpp.status === "published",
    },
  } as const;
}

export async function getDppList(
  organizationId: string,
  input: {
    limit: number;
    offset: number;
    productIds?: string[] | undefined;
    search?: string | undefined;
    status?: DppStatus | undefined;
  },
) {
  return { ok: true, value: await listDppRecords(db, organizationId, input) } as const;
}

// prEN 18222 4.5 ReadDPPIdsByProductIds: resolve a set of product IDs to the
// matching DPP identifiers, with cursor pagination.
export async function getDppIdsByProductIds(
  organizationId: string,
  productIds: string[],
  options: { limit: number; cursor?: string | undefined },
) {
  return {
    ok: true,
    value: await listDppIdsByProductIds(db, organizationId, productIds, options),
  } as const;
}

export async function createDppSnapshot(
  organizationId: string,
  actorUserId: string,
  input: CreateDppInput,
  role: OrganizationRole,
): Promise<ServiceResult<{ dpp: DppSnapshot; publicId: string }>> {
  const entitlement = await entitlements.checkDppCreateAllowed(organizationId);
  if (!entitlement.allowed) {
    return quotaExceeded(entitlement.code, entitlement.message);
  }

  const writeViolations = findWriteViolations(
    { collections: input.collections, dataElements: input.dataElements },
    role,
  );
  if (writeViolations.length > 0) {
    return forbidden(
      "DPP_ELEMENT_WRITE_FORBIDDEN",
      `Role ${role} may not write data elements: ${writeViolations.join(", ")}`,
    );
  }

  const snapshot: DppSnapshot = {
    digitalProductPassportId: `urn:dpp:${randomUUID()}`,
    productId: input.productId,
    granularity: input.granularity,
    dppSchemaVersion: input.dppSchemaVersion,
    status: "draft",
    lastUpdate: now(),
    economicOperatorId: input.economicOperatorId,
    facilityId: input.facilityId,
    collections: input.collections,
    dataElements: input.dataElements,
  };

  const referenceError = await assertReferencesResolve(organizationId, snapshot);
  if (referenceError) return referenceError;

  const validationError = await assertSnapshotValid(organizationId, snapshot);
  if (validationError) return validationError;

  let created: Awaited<ReturnType<typeof createDppRecord>>;
  try {
    created = await createDppRecord(db, {
      actorUserId,
      organizationId,
      snapshot,
    });
  } catch (error) {
    // The DPP identifier is globally unique; a collision (astronomically
    // unlikely for a generated URN, but enforced) is rejected, not 500'd.
    if (isUniqueViolation(error)) {
      return conflict("DPP_ID_CONFLICT", "A DPP with this identifier already exists");
    }
    throw error;
  }

  // The snapshot keeps the norm shape; the public id rides alongside it so the
  // client can link to the new DPP under its short URL right away.
  return { ok: true, value: { dpp: snapshot, publicId: created.publicId } };
}

export async function patchDppSnapshot(
  organizationId: string,
  actorUserId: string,
  dppId: string,
  input: PatchDppInput,
  role: OrganizationRole,
): Promise<ServiceResult<DppSnapshot>> {
  const existing = await findDppByDigitalId(db, organizationId, dppId);
  if (!existing) {
    return notFound("DPP_NOT_FOUND", "DPP not found");
  }

  if (existing.status !== "draft") {
    return conflict("DPP_NOT_EDITABLE", "Only draft DPPs can be patched");
  }

  const existingSnapshot = existing.currentSnapshot as DppSnapshot;
  const updated: DppSnapshot = {
    ...existingSnapshot,
    ...input.snapshot,
    // Identity and lifecycle status are never mutated via patch.
    digitalProductPassportId: existingSnapshot.digitalProductPassportId,
    status: existingSnapshot.status,
    lastUpdate: now(),
  };

  // A client sends back what it saw, and `filterSnapshotForRole` withheld
  // everything its role may not read. Before saving, those elements are
  // reinserted: their absence is a side effect of filtering, not an intent to
  // delete. Something visible that is still missing counts as a deletion and is
  // checked like a write.
  const { removedPaths, snapshot: reconciled } = reconcilePatchForRole(
    existingSnapshot,
    updated,
    role,
  );

  // Authorize the resulting snapshot against the stored one: write permission is
  // checked against the existing policy (so a client cannot relax a policy and
  // write in the same patch), and policy/visibility changes are admin-only.
  const violations = findElementSecurityViolations(
    existingSnapshot,
    reconciled,
    role,
    removedPaths,
  );
  if (violations.length > 0) {
    const denied = dedupePaths(violations.filter((v) => v.reason === "write-forbidden"));
    const policyChanges = dedupePaths(
      violations.filter((v) => v.reason === "policy-change-forbidden"),
    );
    const parts: string[] = [];
    if (denied.length > 0) parts.push(`may not write ${denied.join(", ")}`);
    if (policyChanges.length > 0) {
      parts.push(`may not change the access policy of ${policyChanges.join(", ")}`);
    }
    return forbidden("DPP_ELEMENT_WRITE_FORBIDDEN", `Role ${role} ${parts.join("; ")}`);
  }

  const referenceError = await assertReferencesResolve(organizationId, reconciled);
  if (referenceError) return referenceError;

  const validationError = await assertSnapshotValid(organizationId, reconciled);
  if (validationError) return validationError;

  // A user-chosen revision label must not reuse one an earlier revision of this
  // DPP already carried, or the history would name two revisions the same.
  if (
    input.versionLabel &&
    (await isDppVersionLabelTaken(db, existing.id, input.versionLabel, existing.versionLabel))
  ) {
    return conflict(
      "VERSION_LABEL_TAKEN",
      `Version ${input.versionLabel} was already used by an earlier revision of this DPP`,
    );
  }

  const updatedRecord = await patchDppRecord(db, {
    actorUserId,
    dppId: existing.id,
    organizationId,
    patch: input.patch ?? input.snapshot ?? {},
    snapshot: reconciled,
    versionLabel: input.versionLabel,
    expectedUpdatedAt: existing.updatedAt,
  });

  if (!updatedRecord) {
    // Existence was verified above, so a missed update means the row changed
    // concurrently (optimistic-lock miss).
    return conflict("DPP_CONCURRENT_MODIFICATION", "DPP was modified concurrently; please retry");
  }

  return { ok: true, value: updatedRecord.currentSnapshot as DppSnapshot };
}

// --- Fine-grained element API (EN 18222 table 19) --------------------------
//
// Reading is role-filtered like everywhere else: what `filterSnapshotForRole`
// removes does not exist for that role - a 404, not a 403, or the response
// would reveal the existence of an element the caller may not see.
//
// Writing goes **through the same patch path** as a full update. Element
// policies, reference checks, dictionary validation, versioning, optimistic
// locking and audit therefore all apply unchanged. Reimplementing them here
// would be the obvious shortcut - and exactly how two write paths end up
// checking different things.

export async function getDppCollection(
  organizationId: string,
  dppId: string,
  collectionId: string,
  role: OrganizationRole,
  actorUserId: string,
): Promise<ServiceResult<DataElementCollection>> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");

  const visible = filterSnapshotForRole(dpp.currentSnapshot as DppSnapshot, role);
  const collection = findCollection(visible, collectionId);
  if (!collection) return notFound("DPP_COLLECTION_NOT_FOUND", "Data element collection not found");

  await recordDppAccess(db, {
    organizationId,
    dppId: dpp.id,
    actorUserId,
    digitalProductPassportId: dpp.digitalProductPassportId,
  });

  return { ok: true, value: collection };
}

export async function getDppElement(
  organizationId: string,
  dppId: string,
  elementPath: string,
  role: OrganizationRole,
  actorUserId: string,
): Promise<ServiceResult<DataElement>> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");

  const visible = filterSnapshotForRole(dpp.currentSnapshot as DppSnapshot, role);
  const found = findElementByPath(visible, elementPath);
  if (!found) return notFound("DPP_ELEMENT_NOT_FOUND", "Data element not found");

  await recordDppAccess(db, {
    organizationId,
    dppId: dpp.id,
    actorUserId,
    digitalProductPassportId: dpp.digitalProductPassportId,
  });

  return { ok: true, value: found.element };
}

// The patch carries part of the element; merged per RFC 7396. `elementId`
// stays out of it: it is the address, and an address is not changed by
// writing into it.
export async function patchDppElement(
  organizationId: string,
  actorUserId: string,
  dppId: string,
  elementPath: string,
  patch: unknown,
  role: OrganizationRole,
): Promise<ServiceResult<DataElement>> {
  const existing = await findDppByDigitalId(db, organizationId, dppId);
  if (!existing) return notFound("DPP_NOT_FOUND", "DPP not found");

  const snapshot = existing.currentSnapshot as DppSnapshot;
  // Looked up against the **stored** state, not the filtered one: a caller who
  // may not write an element should learn that from the policy gate, not from
  // a 404 that hides its existence while the write would fail anyway.
  const found = findElementByPath(snapshot, elementPath);
  if (!found) return notFound("DPP_ELEMENT_NOT_FOUND", "Data element not found");

  const merged = applyMergePatch(found.element, patch) as DataElement;
  const next = replaceElementAtPath(snapshot, elementPath, {
    ...merged,
    elementId: found.element.elementId,
  });
  if (!next) return notFound("DPP_ELEMENT_NOT_FOUND", "Data element not found");

  const result = await patchDppSnapshot(
    organizationId,
    actorUserId,
    dppId,
    { snapshot: { collections: next.collections, dataElements: next.dataElements } },
    role,
  );
  if (!result.ok) return result;

  const updated = findElementByPath(result.value, elementPath);
  if (!updated) return notFound("DPP_ELEMENT_NOT_FOUND", "Data element not found");

  return { ok: true, value: updated.element };
}

export async function patchDppCollection(
  organizationId: string,
  actorUserId: string,
  dppId: string,
  collectionId: string,
  patch: unknown,
  role: OrganizationRole,
): Promise<ServiceResult<DataElementCollection>> {
  const existing = await findDppByDigitalId(db, organizationId, dppId);
  if (!existing) return notFound("DPP_NOT_FOUND", "DPP not found");

  const snapshot = existing.currentSnapshot as DppSnapshot;
  const collection = findCollection(snapshot, collectionId);
  if (!collection) return notFound("DPP_COLLECTION_NOT_FOUND", "Data element collection not found");

  const merged = applyMergePatch(collection, patch) as DataElementCollection;
  const next = replaceCollection(snapshot, collectionId, {
    ...merged,
    elementId: collection.elementId,
  });
  if (!next) return notFound("DPP_COLLECTION_NOT_FOUND", "Data element collection not found");

  const result = await patchDppSnapshot(
    organizationId,
    actorUserId,
    dppId,
    { snapshot: { collections: next.collections, dataElements: next.dataElements } },
    role,
  );
  if (!result.ok) return result;

  const updated = findCollection(result.value, collectionId);
  if (!updated) return notFound("DPP_COLLECTION_NOT_FOUND", "Data element collection not found");

  return { ok: true, value: updated };
}

// EN 18222 table 17 `ReadDPPVersionByProductIdAndDate`.
//
// Two things here are deliberate decisions, not the obvious default:
//
//   * **Published versions only.** A draft that existed at that point in time
//     was never the passport's statement - "what did it say back then" means
//     what someone could actually have read at the time.
//   * **The timestamp needs a time zone.** `2026-03-01T10:00:00` is a
//     different instant depending on the reader, and which version answers
//     can hinge on that hour. A timestamp without a zone is therefore
//     rejected, not guessed.
// Which newer versions of the bound dictionary exist and what upgrading to
// one of them would change.
//
// **Read-only.** The upgrade itself goes through the ordinary PATCH on
// `dppSchemaVersion` - the same path, the same permissions, the same
// validation. A separate write path would have created a second place where
// permissions can be forgotten.
export async function getDictionaryUpgrade(
  organizationId: string,
  dppId: string,
): Promise<
  ServiceResult<{
    candidates: {
      diff: DictionaryUpgradeDiff;
      dppSchemaVersion: string;
      status: string;
      version: string;
    }[];
    current: { repositoryKey: string; version: string };
  }>
> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");

  const snapshot = dpp.currentSnapshot as DppSnapshot;
  const separator = snapshot.dppSchemaVersion.lastIndexOf("/");
  if (separator <= 0) {
    return notFound(
      "DPP_DICTIONARY_BINDING_INVALID",
      `Die Bindung „${snapshot.dppSchemaVersion}" nennt keine Wörterbuchversion`,
    );
  }
  const repositoryKey = snapshot.dppSchemaVersion.slice(0, separator);
  const version = snapshot.dppSchemaVersion.slice(separator + 1);

  const currentEntries =
    (await listDataDictionaryEntriesForBinding(db, organizationId, snapshot.dppSchemaVersion)) ??
    [];
  const references = passportReferences(snapshot);

  const versions = await listDataDictionaryRepositoriesByKey(db, organizationId, repositoryKey);
  const newer = versions
    .filter((candidate) => compareVersionLabels(candidate.version, version) > 0)
    // Offering a withdrawn version as a target would send the caller into a
    // dead end. A draft is no better: it can still change.
    .filter((candidate) => candidate.status === "active")
    .sort((left, right) => compareVersionLabels(left.version, right.version));

  const candidates = await Promise.all(
    newer.map(async (candidate) => {
      const entries = await listDataDictionaryEntriesByRepositoryId(
        db,
        organizationId,
        candidate.id,
      );
      return {
        diff: diffDictionaryVersions(currentEntries, entries, references),
        dppSchemaVersion: `${repositoryKey}/${candidate.version}`,
        status: candidate.status,
        version: candidate.version,
      };
    }),
  );

  return {
    ok: true,
    value: {
      // A version that differs in nothing is not worth reporting.
      candidates: candidates.filter((candidate) => !isEmptyUpgrade(candidate.diff)),
      current: { repositoryKey, version },
    },
  };
}

// Every identifier under which the passport references dictionary entries -
// top level **and** collections. Taking only the top level would report every
// data point in a collection as missing; in one reported passport that was 24
// of 29.
function passportReferences(snapshot: DppSnapshot): string[] {
  const references: string[] = [];
  const add = (element: { dictionaryReference?: string; elementId: string }) => {
    references.push(element.dictionaryReference ?? element.elementId);
  };

  for (const element of snapshot.dataElements) add(element);
  for (const collection of snapshot.collections) {
    for (const element of collection.dataElements) add(element);
  }

  return references;
}

export async function getDppVersionAtDate(
  organizationId: string,
  dppId: string,
  at: Date,
  role: OrganizationRole,
  actorUserId: string,
): Promise<
  ServiceResult<{
    createdAt: Date;
    snapshot: DppSnapshot;
    status: DppStatus;
    versionLabel: string;
    versionNumber: number;
  }>
> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");

  const version = await findPublishedVersionAtDate(db, dpp.id, at);
  if (!version) {
    // Not a caller error: at that point in time there was simply nothing to
    // read yet, because the passport had not been published.
    return notFound(
      "DPP_VERSION_NOT_FOUND",
      `No published version of this DPP existed at ${at.toISOString()}`,
    );
  }

  await recordDppAccess(db, {
    organizationId,
    dppId: dpp.id,
    actorUserId,
    digitalProductPassportId: dpp.digitalProductPassportId,
  });

  return {
    ok: true,
    value: {
      createdAt: version.createdAt,
      snapshot: filterSnapshotForRole(version.snapshot as DppSnapshot, role),
      status: version.status,
      versionLabel: version.versionLabel,
      versionNumber: version.versionNumber,
    },
  };
}

// EN 18222 table 17 `DeleteDPPById`. Only a draft that was never published can
// be deleted; everything else is archived. The reasoning lives at the
// repository - here it is just translated into a response.
export async function deleteDpp(
  organizationId: string,
  actorUserId: string,
  dppId: string,
): Promise<ServiceResult<{ digitalProductPassportId: string }>> {
  const outcome = await deleteDraftDppRecord(db, { organizationId, dppId, actorUserId });

  if (outcome.reason === "not-found") return notFound("DPP_NOT_FOUND", "DPP not found");
  if (outcome.reason === "not-deletable") {
    return conflict(
      "DPP_NOT_DELETABLE",
      `Only a draft that was never published can be deleted; this DPP is ${outcome.status}. Archive it instead.`,
    );
  }

  return { ok: true, value: { digitalProductPassportId: outcome.digitalProductPassportId } };
}

// Export in the norm's shape (G28). Deliberately via `listDppRecords` and then
// the stored snapshots: the export should show what is in the platform, not
// what a second query reconstructs from it.
//
// Role-filtered like any read - an export is not a detour around the
// policies. A viewer who exports gets exactly the elements they would also
// see individually.
export async function exportDpps(
  organizationId: string,
  input: { limit: number; offset: number; status?: DppStatus | undefined },
  role: OrganizationRole,
): Promise<
  ServiceResult<{
    dpps: { dpp: DppSnapshot; publicId: string }[];
    exportedAt: Date;
    total: number;
  }>
> {
  const listed = await listDppRecords(db, organizationId, {
    limit: input.limit,
    offset: input.offset,
    status: input.status,
  });

  const snapshots = await Promise.all(
    listed.dpps.map(async (row) => {
      const record = await findDppByDigitalId(db, organizationId, row.publicId);
      if (!record) return undefined;

      return {
        dpp: filterSnapshotForRole(record.currentSnapshot as DppSnapshot, role),
        publicId: record.publicId,
      };
    }),
  );

  return {
    ok: true,
    value: {
      dpps: snapshots.filter((entry) => entry !== undefined),
      exportedAt: new Date(),
      total: listed.total,
    },
  };
}

export async function getDppVersions(organizationId: string, dppId: string) {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");
  return { ok: true, value: await listDppVersions(db, dpp.id) } as const;
}

export async function getDppVersionDetail(
  organizationId: string,
  dppId: string,
  versionNumber: number,
  role: OrganizationRole,
): Promise<
  ServiceResult<{
    versionNumber: number;
    status: DppStatus;
    createdBy: string;
    createdAt: Date;
    snapshot: DppSnapshot;
  }>
> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");

  const version = await getDppVersionSnapshot(db, dpp.id, versionNumber);
  if (!version) return notFound("DPP_VERSION_NOT_FOUND", "DPP version not found");

  return {
    ok: true,
    value: {
      versionNumber: version.versionNumber,
      status: version.status,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      // Read policy applies to historical snapshots too: hide elements the role
      // may not read (prEN 18239).
      snapshot: filterSnapshotForRole(version.snapshot as DppSnapshot, role),
    },
  };
}

export async function getDppAudit(organizationId: string, dppId: string) {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");
  return { ok: true, value: await listDppAuditEvents(db, dpp.id) } as const;
}

type TimelineEntry = {
  id: string;
  at: Date;
  actor: string;
  kind: "created" | "updated" | "status" | "relationship-added" | "relationship-removed";
  status: DppStatus;
  statusFrom?: DppStatus;
  statusTo?: DppStatus;
  fieldDiffs: DppFieldDiff[];
};

// Builds the DPP change feed (newest first): a version-diff based history of
// status transitions and field changes (with before/after), merged with
// relationship add/remove events. Read accesses never create a version, so they
// never appear. Snapshots are role-filtered before diffing so a viewer never
// sees changes to controlled fields they may not read.
export async function getDppTimeline(
  organizationId: string,
  dppId: string,
  role: OrganizationRole,
): Promise<ServiceResult<TimelineEntry[]>> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");

  const versions = await listDppVersionsWithSnapshots(db, dpp.id);
  const entries: TimelineEntry[] = [];

  for (let index = 0; index < versions.length; index += 1) {
    const version = versions[index];
    if (!version) continue;
    const current = filterSnapshotForRole(version.snapshot as DppSnapshot, role);
    const previous = versions[index - 1];

    if (!previous) {
      entries.push({
        id: `v${version.versionNumber}`,
        at: version.createdAt,
        actor: version.createdBy,
        kind: "created",
        status: version.status,
        fieldDiffs: [],
      });
      continue;
    }

    const statusChanged = previous.status !== version.status;
    const fieldDiffs = diffDppSnapshots(
      filterSnapshotForRole(previous.snapshot as DppSnapshot, role),
      current,
    );
    // A version with neither a status change nor readable field changes carries
    // no information for this role - skip it.
    if (!statusChanged && fieldDiffs.length === 0) continue;

    entries.push({
      id: `v${version.versionNumber}`,
      at: version.createdAt,
      actor: version.createdBy,
      kind: statusChanged ? "status" : "updated",
      status: version.status,
      statusFrom: statusChanged ? previous.status : undefined,
      statusTo: statusChanged ? version.status : undefined,
      fieldDiffs,
    });
  }

  // Relationship changes are real edits but live outside the snapshot; fold them
  // in from the audit trail.
  const audit = await listDppAuditEvents(db, dpp.id);
  for (const event of audit) {
    if (
      event.eventType === "dpp.relationship.created" ||
      event.eventType === "dpp.relationship.deleted"
    ) {
      entries.push({
        id: event.id,
        at: event.createdAt,
        actor: event.actorUserId,
        kind:
          event.eventType === "dpp.relationship.created"
            ? "relationship-added"
            : "relationship-removed",
        status: dpp.status,
        fieldDiffs: [],
      });
    }
  }

  entries.sort((a, b) => b.at.getTime() - a.at.getTime());
  return { ok: true, value: entries };
}

// Restores a historical version into the current draft by replaying its snapshot
// through the normal patch path - so draft-only, element write policies,
// validation, optimistic locking, versioning and audit all apply unchanged.
export async function restoreDppVersion(
  organizationId: string,
  actorUserId: string,
  dppId: string,
  versionNumber: number,
  role: OrganizationRole,
): Promise<ServiceResult<DppSnapshot>> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");

  const version = await getDppVersionSnapshot(db, dpp.id, versionNumber);
  if (!version) return notFound("DPP_VERSION_NOT_FOUND", "DPP version not found");

  const historical = version.snapshot as DppSnapshot;
  return patchDppSnapshot(
    organizationId,
    actorUserId,
    dppId,
    {
      snapshot: {
        productId: historical.productId,
        granularity: historical.granularity,
        dppSchemaVersion: historical.dppSchemaVersion,
        economicOperatorId: historical.economicOperatorId,
        facilityId: historical.facilityId,
        collections: historical.collections,
        dataElements: historical.dataElements,
      },
    },
    role,
  );
}

// Runs the hard publish validator against the current snapshot, scoping the
// dictionary entries to the DPP's linked repository so the required-datapoint
// check is correct.
async function buildValidationReport(
  organizationId: string,
  snapshot: DppSnapshot,
): Promise<ValidationReport> {
  // Validate against the exact dictionary version the DPP pins, not merely the
  // repositoryKey: since G65 an organization can hold several versions of one
  // dictionary, and a newer one may have added required fields this snapshot was
  // never meant to satisfy.
  //
  // `undefined` and `[]` are different answers: the first means the binding
  // names no dictionary version this organization holds, the second that the
  // one it names is empty. Collapsing them would report every element as an
  // unresolved reference instead of naming the broken binding once.
  const entries = await listDataDictionaryEntriesForBinding(
    db,
    organizationId,
    snapshot.dppSchemaVersion,
  );

  return validateSnapshotForPublish(snapshot, entries ?? [], {
    bindingResolved: entries !== undefined,
  });
}

export async function getDppValidation(
  organizationId: string,
  dppId: string,
): Promise<ServiceResult<ValidationReport>> {
  const dpp = await findDppByDigitalId(db, organizationId, dppId);
  if (!dpp) return notFound("DPP_NOT_FOUND", "DPP not found");
  return {
    ok: true,
    value: await buildValidationReport(organizationId, dpp.currentSnapshot as DppSnapshot),
  };
}

// Creates a new editable revision from a published DPP (published -> draft),
// keeping the published version active and publicly reachable (prEN 18222
// UpdateDPPById / prEN 18223 4.2). Direct overwrites of a published snapshot stay
// blocked; this is the sanctioned way to make lifecycle changes.
export async function createDppRevision(
  organizationId: string,
  actorUserId: string,
  dppId: string,
): Promise<ServiceResult<DppSnapshot>> {
  const result = await createDppRevisionRecord(db, { organizationId, dppId, actorUserId });
  if (!result.ok) {
    if (result.reason === "not-found") return notFound("DPP_NOT_FOUND", "DPP not found");
    return conflict("DPP_NOT_PUBLISHED", "A new revision can only be created from a published DPP");
  }
  return { ok: true, value: result.snapshot };
}

export async function transitionDppStatus(
  organizationId: string,
  actorUserId: string,
  dppId: string,
  targetStatus: DppStatus,
  comment?: string,
): Promise<ServiceResult<DppSnapshot>> {
  const existing = await findDppByDigitalId(db, organizationId, dppId);
  if (!existing) {
    return notFound("DPP_NOT_FOUND", "DPP not found");
  }

  const existingSnapshot = existing.currentSnapshot as DppSnapshot;
  if (!canTransitionDppStatus(existing.status, targetStatus)) {
    return conflict(
      "DPP_INVALID_STATUS_TRANSITION",
      `Cannot transition DPP from ${existing.status} to ${targetStatus}`,
    );
  }

  // Hard validation gate: a DPP may only be published if it passes the
  // completeness/consistency validator (G4). The snapshot is re-validated here,
  // not just at edit time.
  if (targetStatus === "published") {
    // Also on publish, not only on write: a passport can predate this check,
    // and a document may have been swept away in the meantime (orphan
    // cleanup). What becomes public should not point into thin air.
    const referenceError = await assertReferencesResolve(organizationId, existingSnapshot);
    if (referenceError) return referenceError;

    const report = await buildValidationReport(organizationId, existingSnapshot);
    if (!report.valid) {
      const detail = report.errors
        .slice(0, 10)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ");
      return unprocessable(
        "DPP_PUBLISH_VALIDATION_FAILED",
        `Veröffentlichung blockiert – ${report.errors.length} Fehler: ${detail}`,
      );
    }
  }

  const updated = await transitionDppRecordStatus(db, {
    actorUserId,
    dppId: existingSnapshot.digitalProductPassportId,
    organizationId,
    status: targetStatus,
    comment,
  });

  if (!updated) {
    return notFound("DPP_NOT_FOUND", "DPP not found");
  }

  return { ok: true, value: updated.currentSnapshot as DppSnapshot };
}

export async function getDppRelationships(organizationId: string, dppId: string) {
  const relationships = await listDppRelationships(db, organizationId, dppId);
  if (!relationships) {
    return notFound("DPP_NOT_FOUND", "DPP not found");
  }

  return { ok: true, value: relationships } as const;
}

export async function createRelationshipForDpp(
  organizationId: string,
  actorUserId: string,
  sourceDppId: string,
  input: CreateDppRelationshipInput,
) {
  const source = await findDppByDigitalId(db, organizationId, sourceDppId);
  if (!source) return notFound("DPP_NOT_FOUND", "Source DPP not found");

  const target = await findDppByDigitalId(db, organizationId, input.targetDigitalProductPassportId);
  if (!target) {
    // Previously an unknown target was simply accepted: the relationship was
    // created with `targetDppId = null` and looked complete in the list. A
    // target belonging to another tenant landed in the same dead end - and
    // both only surfaced once someone followed the link.
    return unprocessableFields("DPP_REFERENCE_NOT_FOUND", [
      {
        path: "targetDigitalProductPassportId",
        text: `Ziel-Pass „${input.targetDigitalProductPassportId}" existiert in dieser Organisation nicht`,
      },
    ]);
  }

  if (target.id === source.id) {
    // "Contains itself" is not a statement about the product but a typo with
    // consequences: any resolution along the relationships would loop forever.
    return unprocessableFields("DPP_SELF_RELATIONSHIP", [
      {
        path: "targetDigitalProductPassportId",
        text: "Ein Pass kann keine Beziehung zu sich selbst haben",
      },
    ]);
  }

  const relationship = await createDppRelationship(db, {
    actorUserId,
    organizationId,
    sourceDigitalProductPassportId: sourceDppId,
    targetDigitalProductPassportId: input.targetDigitalProductPassportId,
    targetProductId: input.targetProductId,
    relationshipType: input.relationshipType,
    visibility: input.visibility,
    validFrom: input.validFrom,
    validTo: input.validTo,
    metadata: input.metadata,
  });

  if (!relationship) {
    return notFound("DPP_NOT_FOUND", "Source DPP not found");
  }

  return { ok: true, value: relationship } as const;
}

export async function deleteRelationshipForDpp(
  organizationId: string,
  actorUserId: string,
  sourceDppId: string,
  relationshipId: string,
) {
  const source = await findDppByDigitalId(db, organizationId, sourceDppId);
  if (!source) {
    return notFound("DPP_NOT_FOUND", "DPP not found");
  }

  const relationship = await deleteDppRelationship(
    db,
    organizationId,
    source.id,
    relationshipId,
    actorUserId,
  );

  if (!relationship) {
    return notFound("DPP_RELATIONSHIP_NOT_FOUND", "Relationship not found");
  }

  return { ok: true, value: relationship } as const;
}

function dedupePaths(violations: { path: string }[]): string[] {
  return [...new Set(violations.map((violation) => violation.path))];
}

function notFound(code: string, message: string) {
  return { code, message, ok: false, status: 404 } as const;
}

function conflict(code: string, message: string) {
  return { code, message, ok: false, status: 409 } as const;
}

function forbidden(code: string, message: string) {
  return { code, message, ok: false, status: 403 } as const;
}

function unprocessable(code: string, message: string) {
  return { code, message, ok: false, status: 422 } as const;
}

function unprocessableFields(code: string, issues: { path?: string; text: string }[]) {
  return {
    code,
    // The combined message stays for callers that only display one line.
    message: issues.map((issue) => issue.text).join("; "),
    ok: false,
    status: 422,
    issues,
  } as const;
}

function quotaExceeded(code: string, message: string) {
  return { code, message, ok: false, status: 402 } as const;
}

// A passport references things that must exist. Previously these were
// free-form strings nobody looked up - a typo in the operator or a document ID
// from another tenant was accepted, passed validation, and only surfaced to a
// reviewer once the link pointed into thin air.
//
// Checked at **write** time: a reference that only surfaces at read time would
// sit in a published version until then.
//
// Deliberately *not* checked:
//   * `productId` - the tenant's external product identifier (ERP number,
//     GTIN). A product record does not need to exist for it; a passport
//     regularly comes into being before the master data is maintained. It
//     cannot leak anything across tenant boundaries, because `productId` is
//     resolved per tenant and the public resolution rejects ambiguity.
//
// `facilityId` has been checkable since the facility model and is
// checked - but only when set: not every passport names a facility.
async function assertReferencesResolve(
  organizationId: string,
  snapshot: Pick<DppSnapshot, "collections" | "dataElements" | "economicOperatorId" | "facilityId">,
): Promise<{ code: string; message: string; ok: false; status: 422 } | null> {
  const issues: { path?: string; text: string }[] = [];

  const documents = collectDocumentReferences(snapshot);
  const [operator, facility, ownBlobIds] = await Promise.all([
    snapshot.economicOperatorId
      ? findEconomicOperatorByBusinessId(db, organizationId, snapshot.economicOperatorId)
      : undefined,
    snapshot.facilityId
      ? findFacilityByBusinessId(db, organizationId, snapshot.facilityId)
      : undefined,
    listOwnBlobIds(
      db,
      organizationId,
      documents.map((document) => document.blobObjectId),
    ),
  ]);

  if (snapshot.economicOperatorId && !operator) {
    // An operator from another tenant may well exist - just not here. The
    // message does not distinguish the two cases, or it would be an oracle
    // for which identifiers exist elsewhere.
    issues.push({
      path: "economicOperatorId",
      text: `Wirtschaftsakteur „${snapshot.economicOperatorId}" existiert in dieser Organisation nicht`,
    });
  }

  if (snapshot.facilityId && !facility) {
    issues.push({
      path: "facilityId",
      text: `Standort „${snapshot.facilityId}" existiert in dieser Organisation nicht`,
    });
  }

  for (const document of documents) {
    if (ownBlobIds.has(document.blobObjectId)) continue;
    issues.push({
      path: document.path,
      text: `Dokument „${document.blobObjectId}" existiert in dieser Organisation nicht`,
    });
  }

  if (issues.length === 0) return null;
  return unprocessableFields("DPP_REFERENCE_NOT_FOUND", issues);
}

// Validates the snapshot's data elements against the organization's data
// dictionary and returns a failed ServiceResult if anything is invalid.
async function assertSnapshotValid(
  organizationId: string,
  snapshot: DppSnapshot,
): Promise<{ code: string; message: string; ok: false; status: 422 } | null> {
  // Same scoping rule as buildValidationReport: the pinned version decides.
  const entries =
    (await listDataDictionaryEntriesForBinding(db, organizationId, snapshot.dppSchemaVersion)) ??
    [];
  const errors = validateSnapshotAgainstDictionary(snapshot, entries);
  if (errors.length === 0) return null;

  const detail = errors
    .slice(0, 20)
    .map((error) => `${error.elementId} (${error.reference}): ${error.message}`)
    .join("; ");
  return unprocessable(
    "DPP_VALIDATION_FAILED",
    `DPP does not match the data dictionary: ${detail}`,
  );
}
