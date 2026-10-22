import { findDppByDigitalId, findPublishedVersionAtDate, listDppRecords } from "@dpp/db";
import {
  filterSnapshotForRole,
  MASS_CANONICAL_URIS,
  parseNumericValue,
  summariseMetric,
  SUSTAINABILITY_METRICS,
  type DataElement,
  type DppSnapshot,
  type MetricContribution,
  type MetricResult,
  type OrganizationRole,
} from "@dpp/domain";

import { db } from "../db.js";
import { listDataDictionaryEntriesForBinding } from "@dpp/db";

// Reporting feed for sustainability reporting: metrics from an organization's
// published passports, with evidence down to the individual passport.
//
// Three decisions that keep the result verifiable:
//
// **1. Only published versions, as of the reference date.** A draft is not a
// fact a company can report. And a report for fiscal year 2026 asks for the
// state as of the reference date, not today's - so resolution goes through
// the same function as the historical query .
//
// **2. Detection via the semantic identifier**, not the dictionary key:
// `entryKey`s are named differently in every organization, a `canonicalUri`
// names the same thing. A tenant whose dictionary carries none of the known
// identifiers gets coverage 0 - and it shows as that, rather than an empty
// number looking like a result.
//
// **3. Role filter like any read.** An evaluation is not a way around the
// element policies. Whoever wouldn't see a controlled element on its own
// doesn't see it here either - and coverage then honestly reports missing
// data instead of quietly counting it in.

export type SustainabilityReport = {
  asOf: Date;
  consideredDpps: number;
  metrics: MetricResult[];
  // What the evaluation *cannot* do is attached to the result, not to a
  // footnote nobody reads.
  scopeNote: string;
};

const SCOPE_NOTE =
  "Diese Auswertung liefert Eingangsgrößen aus veröffentlichten Produktpässen, keine berichtsfertigen ESRS-Kennzahlen. Konsolidierungskreis, Berichtszeitraum, Allokation und Doppelzählung liegen außerhalb dessen, was die Plattform kennt; die berichtete Zahl verantwortet der Berichtspflichtige.";

export async function buildSustainabilityReport(
  organizationId: string,
  asOf: Date,
  role: OrganizationRole,
): Promise<SustainabilityReport> {
  // Only published passports are considered; the page size is deliberately
  // high because a report means the whole assortment, not one page of it.
  const listed = await listDppRecords(db, organizationId, {
    limit: 500,
    offset: 0,
    status: "published",
  });

  const snapshots = await Promise.all(
    listed.dpps.map(async (row) => {
      const record = await findDppByDigitalId(db, organizationId, row.publicId);
      if (!record) return undefined;

      const version = await findPublishedVersionAtDate(db, record.id, asOf);
      if (!version) return undefined;

      return {
        publicId: record.publicId,
        // Filtered here and only here: what this role may not read does not
        // exist for the evaluation and is therefore missing from coverage too
        // - visibly, instead of being quietly counted in.
        snapshot: filterSnapshotForRole(version.snapshot as DppSnapshot, role),
        versionLabel: version.versionLabel,
      };
    }),
  );

  const passports = snapshots.filter((entry) => entry !== undefined);

  // The element-to-semantic-identifier mapping lives in the bound dictionary.
  // It's resolved per passport because two passports can bind different
  // dictionary versions.
  const resolved = await Promise.all(
    passports.map(async (passport) => ({
      ...passport,
      references: await canonicalUriByElementPath(organizationId, passport.snapshot),
    })),
  );

  const metrics = SUSTAINABILITY_METRICS.map((definition) => {
    const contributions: MetricContribution[] = [];
    const unparsable: { publicId: string; raw: unknown }[] = [];

    for (const passport of resolved) {
      const raw = valueForUris(passport.references, definition.canonicalUris);
      if (raw === undefined) continue;

      // A statement (`presence`) is not forced into a number - that would make
      // no sense for a substance name or a declaration reference. What's
      // counted is that it's present; empty doesn't count as present.
      if (definition.aggregation === "presence") {
        if (typeof raw === "string" && raw.trim() === "") continue;

        contributions.push({
          publicId: passport.publicId,
          raw,
          value: null,
          versionLabel: passport.versionLabel,
        });
        continue;
      }

      const value = parseNumericValue(raw);
      if (value === undefined) {
        unparsable.push({ publicId: passport.publicId, raw });
        continue;
      }

      contributions.push({
        mass: parseNumericValue(valueForUris(passport.references, MASS_CANONICAL_URIS)),
        publicId: passport.publicId,
        raw,
        value,
        versionLabel: passport.versionLabel,
      });
    }

    return summariseMetric(definition, {
      contributions,
      total: passports.length,
      unparsable,
    });
  });

  return { asOf, consideredDpps: passports.length, metrics, scopeNote: SCOPE_NOTE };
}

function valueForUris(references: Map<string, unknown>, canonicalUris: string[]): unknown {
  for (const uri of canonicalUris) {
    const value = references.get(uri);
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

// Builds the "semantic identifier -> value" mapping for a passport. Elements
// without a `dictionaryReference` are left out: without it there's no way to
// tell *which* quantity the value represents, and guessing a field by its
// name is exactly the kind of imprecision a report cannot tolerate.
async function canonicalUriByElementPath(
  organizationId: string,
  snapshot: DppSnapshot,
): Promise<Map<string, unknown>> {
  const entries =
    (await listDataDictionaryEntriesForBinding(db, organizationId, snapshot.dppSchemaVersion)) ??
    [];

  // An entry is reachable through several identifiers - the same resolution
  // as in the validator, so both mean the same element.
  const canonicalByReference = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.canonicalUri) continue;
    for (const reference of [entry.canonicalUri, entry.entryKey, entry.externalId]) {
      if (reference) canonicalByReference.set(reference, entry.canonicalUri);
    }
  }

  const values = new Map<string, unknown>();
  const visit = (element: DataElement) => {
    if (element.kind !== "single") return;
    if (!element.dictionaryReference) return;

    const canonical = canonicalByReference.get(element.dictionaryReference);
    if (canonical) values.set(canonical, element.value);
  };

  // The snapshot was already role-filtered while being collected.
  for (const collection of snapshot.collections) collection.dataElements.forEach(visit);
  snapshot.dataElements.forEach(visit);

  return values;
}
