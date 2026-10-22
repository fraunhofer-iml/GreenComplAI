import { findLatestDppByProductId } from "@dpp/db";
import type { OrganizationRole } from "@dpp/domain";
import type { DppImportInput } from "@dpp/schemas";

import { db } from "../db.js";
import { createDppSnapshot, patchDppSnapshot } from "./dpps.js";

// Bulk creation and maintenance of digital product passports (/).
//
// Three decisions carry this, and all three are trade-offs:
//
// **1. Row by row, not all-or-nothing.** An import of 500 passports that fails entirely
// because of a typo in row 297 is worthless to the caller: they don't know what was wrong and
// have to redo everything. Each row is therefore its own transaction, and the response is a
// report. The cost is a possible partial success - the report states that explicitly instead
// of hiding it.
//
// **2. Idempotency via the domain key, not an extra header.** `productId` is unique per
// tenant, so a second import of the same data updates instead of duplicating. An
// `Idempotency-Key` with its own table would be the more elaborate answer to the same
// question - and one that only helps with retries of the *same* request, not the nightly full
// sync from the ERP that sends the identical data again.
//
// **3. The same write path as a single passport.** Each row goes through `createDppSnapshot`
// or `patchDppSnapshot` - with the role gate, element policies, reference validation ,
// dictionary validation, versioning, and audit. A dedicated bulk path would be faster and would
// be exactly the place where a check eventually goes missing.

export type ImportRowOutcome = {
  code?: string;
  message?: string;
  productId: string;
  publicId?: string;
  status: "created" | "updated" | "skipped" | "failed";
};

export type ImportReport = {
  created: number;
  failed: number;
  rows: ImportRowOutcome[];
  skipped: number;
  updated: number;
};

export async function importDpps(
  organizationId: string,
  actorUserId: string,
  input: DppImportInput,
  role: OrganizationRole,
): Promise<ImportReport> {
  const rows: ImportRowOutcome[] = [];

  // Deliberately sequential, not concurrent: rows in an import can target the same passport
  // (the same product ID twice in one file), and running them in parallel would then race into
  // a conflict instead of an update.
  for (const entry of input.dpps) {
    rows.push(await importOne(organizationId, actorUserId, entry, role));
  }

  return {
    created: rows.filter((row) => row.status === "created").length,
    failed: rows.filter((row) => row.status === "failed").length,
    rows,
    skipped: rows.filter((row) => row.status === "skipped").length,
    updated: rows.filter((row) => row.status === "updated").length,
  };
}

async function importOne(
  organizationId: string,
  actorUserId: string,
  entry: DppImportInput["dpps"][number],
  role: OrganizationRole,
): Promise<ImportRowOutcome> {
  const existing = await findLatestDppByProductId(db, organizationId, entry.productId);

  if (!existing) {
    const created = await createDppSnapshot(organizationId, actorUserId, entry, role);
    if (!created.ok) {
      return {
        code: created.code,
        message: created.message,
        productId: entry.productId,
        status: "failed",
      };
    }

    return { productId: entry.productId, publicId: created.value.publicId, status: "created" };
  }

  // A published passport is **not** overwritten - not even silently. The import reports it as
  // skipped with a reason; changing it requires opening a revision. Opening one automatically
  // here would be convenient and wrong: retracting a publication is a decision, not a side
  // effect of a nightly run.
  if (existing.status !== "draft") {
    return {
      code: "DPP_NOT_EDITABLE",
      message: `A ${existing.status} DPP exists for this product; open a revision before importing changes`,
      productId: entry.productId,
      publicId: existing.publicId,
      status: "skipped",
    };
  }

  const patched = await patchDppSnapshot(
    organizationId,
    actorUserId,
    existing.digitalProductPassportId,
    {
      snapshot: {
        collections: entry.collections,
        dataElements: entry.dataElements,
        dppSchemaVersion: entry.dppSchemaVersion,
        economicOperatorId: entry.economicOperatorId,
        facilityId: entry.facilityId,
        granularity: entry.granularity,
        productId: entry.productId,
      },
    },
    role,
  );

  if (!patched.ok) {
    return {
      code: patched.code,
      message: patched.message,
      productId: entry.productId,
      publicId: existing.publicId,
      status: "failed",
    };
  }

  return { productId: entry.productId, publicId: existing.publicId, status: "updated" };
}
