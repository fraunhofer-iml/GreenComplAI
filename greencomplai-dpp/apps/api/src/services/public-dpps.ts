import {
  findPublicDataDictionaryRepositoryByKey,
  findPublicDppByDigitalId,
  findPublicDppByProductId,
  listDataDictionaryEntriesForBinding,
  listDataDictionaryRepositories,
  listPublicDataDictionaryEntriesByRepositoryKey,
  listPublicOutgoingDppRelationships,
} from "@dpp/db";
import { isPubliclyVisible, type DppSnapshot } from "@dpp/domain";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { db } from "../db.js";
import {
  stripInternalDictionaryMetadata,
  stripInternalDictionaryMetadataList,
} from "./dictionary-metadata.js";
import type { ServiceResult } from "./dpps.js";

type PublicDpp = DppSnapshot & {
  collections: DppSnapshot["collections"];
  dataElements: DppSnapshot["dataElements"];
};

type PublicDppReadPayload = {
  profile: PublicDppProfile;
  dictionaryEntries: unknown[];
  dictionaryRepositories: unknown[];
  dpp: PublicDpp;
  // Short handle this passport is reachable under (/dpp/{publicId}); the QR
  // code and canonical link are built from it, not from the URN.
  publicId: string;
  relationships: Awaited<ReturnType<typeof listPublicOutgoingDppRelationships>>;
};

type PublicDppProfile = {
  dictionary?: string;
  dictionaryVersion?: string;
  schemaVersion: string;
};

export async function getPublicProductPassport(
  productId: string,
): Promise<ServiceResult<PublicDppReadPayload>> {
  const { dpp, ambiguous } = await findPublicDppByProductId(db, productId);
  if (!dpp) {
    return {
      code: "PUBLIC_DPP_NOT_FOUND",
      message: "Published DPP not found",
      ok: false,
      status: 404 satisfies ContentfulStatusCode,
    };
  }
  if (ambiguous) {
    // A productId is not globally unique. Refuse rather than return an
    // arbitrary tenant's passport; the canonical DPP-id URL is deterministic.
    return {
      code: "PUBLIC_DPP_AMBIGUOUS",
      message:
        "This product identifier matches published passports in multiple organizations; resolve via the canonical DPP id instead.",
      ok: false,
      status: 409 satisfies ContentfulStatusCode,
    };
  }

  return buildPublicDppReadPayload(dpp);
}

export async function getPublicDigitalProductPassport(
  digitalProductPassportId: string,
): Promise<ServiceResult<PublicDppReadPayload>> {
  const dpp = await findPublicDppByDigitalId(db, digitalProductPassportId);
  if (!dpp) {
    return {
      code: "PUBLIC_DPP_NOT_FOUND",
      message: "Published DPP not found",
      ok: false,
      status: 404,
    };
  }

  return buildPublicDppReadPayload(dpp);
}

export async function getPublicDictionary(repositoryKey: string) {
  const repository = await findPublicDataDictionaryRepositoryByKey(db, repositoryKey);
  if (!repository) {
    return {
      code: "PUBLIC_DICTIONARY_NOT_FOUND",
      message: "Active public dictionary not found",
      ok: false,
      status: 404,
    } as const;
  }

  return {
    ok: true,
    value: {
      repository: stripInternalDictionaryMetadata(repository),
    },
  } as const;
}

export async function getPublicDictionaryEntries(repositoryKey: string) {
  const entries = await listPublicDataDictionaryEntriesByRepositoryKey(db, repositoryKey);
  if (!entries) {
    return {
      code: "PUBLIC_DICTIONARY_NOT_FOUND",
      message: "Active public dictionary not found",
      ok: false,
      status: 404,
    } as const;
  }

  return {
    ok: true,
    value: {
      entries: stripInternalDictionaryMetadataList(entries),
    },
  } as const;
}

async function buildPublicDppReadPayload(
  dpp: NonNullable<Awaited<ReturnType<typeof findPublicDppByDigitalId>>>,
): Promise<ServiceResult<PublicDppReadPayload>> {
  // The resolver supplies the active published version's snapshot; project it to
  // the public-eligible elements only.
  const publicDpp = toPublicDpp(dpp.publicSnapshot) as PublicDpp;

  const [relationships, dictionaryEntries, dictionaryRepositories] = await Promise.all([
    listPublicOutgoingDppRelationships(db, dpp.organizationId, dpp.id),
    // Scoped to the version the published snapshot pins, not the whole
    // organization: several versions of one dictionary can coexist since
    // , and they share entryKeys.
    listDataDictionaryEntriesForBinding(db, dpp.organizationId, publicDpp.dppSchemaVersion),
    listDataDictionaryRepositories(db, dpp.organizationId),
  ]);
  const profile = resolveProfile(publicDpp);
  const publicDictionaryRepositories = dictionaryRepositories
    .filter((repository) => repository.status === "active")
    .filter((repository) =>
      profile.dictionary
        ? repository.repositoryKey === profile.dictionary &&
          repository.version === profile.dictionaryVersion
        : true,
    )
    .map(stripInternalDictionaryMetadata);
  const publicDictionaryEntries = stripInternalDictionaryMetadataList(
    (dictionaryEntries ?? [])
      .filter((entry) => entry.visibility === "public")
      .filter((entry) => isEntryReferencedByDpp(entry, publicDpp)),
  );

  return {
    ok: true,
    value: {
      dpp: publicDpp,
      publicId: dpp.publicId,
      dictionaryEntries: publicDictionaryEntries,
      dictionaryRepositories: publicDictionaryRepositories,
      profile,
      relationships,
    },
  };
}

function toPublicDpp(dpp: DppSnapshot): PublicDpp {
  return {
    ...dpp,
    collections: dpp.collections.filter(isPubliclyVisible).map((collection) => ({
      ...collection,
      dataElements: collection.dataElements.filter(isPubliclyVisible),
    })),
    dataElements: dpp.dataElements.filter(isPubliclyVisible),
  };
}

function resolveProfile(dpp: PublicDpp): PublicDppProfile {
  const [dictionary, dictionaryVersion] = dpp.dppSchemaVersion.split("/");

  return {
    dictionary,
    dictionaryVersion,
    schemaVersion: dpp.dppSchemaVersion,
  };
}

function isEntryReferencedByDpp(
  entry: {
    canonicalUri: string | null;
    entryKey: string;
    externalId: string | null;
  },
  dpp: PublicDpp,
) {
  const references = new Set(
    publicDataElements(dpp).flatMap((element) => [element.dictionaryReference, element.elementId]),
  );

  return [entry.canonicalUri, entry.entryKey, entry.externalId].some(
    (reference) => reference && references.has(reference),
  );
}

function publicDataElements(dpp: PublicDpp) {
  return [...dpp.dataElements, ...dpp.collections.flatMap((collection) => collection.dataElements)];
}
