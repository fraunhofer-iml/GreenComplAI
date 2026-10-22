import { and, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { DppRelationshipType, VisibilityLevel } from "@dpp/domain";

import type { Database } from "../index.js";
import { auditEvents, dpps, dppRelationships } from "../schema.js";
import { findDppByDigitalId } from "./dpps.js";

// What a relationship looks like on the wire. Kept next to the queries that
// serve it so the two cannot drift.
const relationshipResponseColumns = {
  id: dppRelationships.id,
  relationshipType: dppRelationships.relationshipType,
  visibility: dppRelationships.visibility,
  targetDigitalProductPassportId: dppRelationships.targetDigitalProductPassportId,
  targetProductId: dppRelationships.targetProductId,
  validFrom: dppRelationships.validFrom,
  validTo: dppRelationships.validTo,
  metadata: dppRelationships.metadata,
};

type CreateRelationshipInput = {
  actorUserId: string;
  metadata?: Record<string, unknown> | undefined;
  organizationId: string;
  relationshipType: DppRelationshipType;
  sourceDigitalProductPassportId: string;
  targetDigitalProductPassportId: string;
  targetProductId?: string | undefined;
  validFrom?: string | undefined;
  validTo?: string | undefined;
  visibility: VisibilityLevel;
};

export async function createDppRelationship(db: Database, input: CreateRelationshipInput) {
  const source = await findDppByDigitalId(
    db,
    input.organizationId,
    input.sourceDigitalProductPassportId,
  );
  if (!source) {
    return undefined;
  }

  const target = await findDppByDigitalId(
    db,
    input.organizationId,
    input.targetDigitalProductPassportId,
  );

  const [relationship] = await db
    .insert(dppRelationships)
    .values({
      organizationId: input.organizationId,
      sourceDppId: source.id,
      targetDppId: target?.id,
      targetDigitalProductPassportId: input.targetDigitalProductPassportId,
      targetProductId: input.targetProductId ?? target?.productId,
      relationshipType: input.relationshipType,
      visibility: input.visibility,
      validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
      validTo: input.validTo ? new Date(input.validTo) : undefined,
      metadata: input.metadata,
    })
    .returning();

  if (!relationship) {
    throw new Error("Failed to create DPP relationship");
  }

  await db.insert(auditEvents).values({
    organizationId: input.organizationId,
    dppId: source.id,
    actorUserId: input.actorUserId,
    eventType: "dpp.relationship.created",
    objectType: "dpp_relationship",
    objectId: relationship.id,
    changedProperties: ["relationshipType", "targetDigitalProductPassportId", "visibility"],
  });

  return relationship;
}

export async function deleteDppRelationship(
  db: Database,
  organizationId: string,
  sourceDppId: string,
  relationshipId: string,
  actorUserId: string,
) {
  const [relationship] = await db
    .delete(dppRelationships)
    .where(
      and(
        eq(dppRelationships.organizationId, organizationId),
        eq(dppRelationships.sourceDppId, sourceDppId),
        eq(dppRelationships.id, relationshipId),
      ),
    )
    .returning();

  if (!relationship) {
    return undefined;
  }

  await db.insert(auditEvents).values({
    organizationId,
    dppId: relationship.sourceDppId,
    actorUserId,
    eventType: "dpp.relationship.deleted",
    objectType: "dpp_relationship",
    objectId: relationship.id,
    changedProperties: ["deleted"],
  });

  return relationship;
}

export async function listDppRelationships(
  db: Database,
  organizationId: string,
  digitalProductPassportId: string,
) {
  const dpp = await findDppByDigitalId(db, organizationId, digitalProductPassportId);
  if (!dpp) {
    return undefined;
  }

  // Explicit columns: the row's own organizationId and the surrogate keys of
  // both ends are join plumbing. The response schema would strip them anyway —
  // not selecting them keeps that from being a per-request event.
  //
  // An edge has two ends, and this passport can sit at either one. Without the
  // direction, the caller would see an **incoming** edge as if it originated
  // here: "isComponentOf" would appear on the whole instead of the part, and
  // the reference would point back at the passport the caller is already on.
  //
  // So direction **and** the other end come along, including its short public
  // ID, so a client can keep linking in the same address form it arrived
  // through. Without it only the URN would remain, and the same view would be
  // reachable under two different addresses depending on the path taken.
  const source = alias(dpps, "source_dpp");
  const target = alias(dpps, "target_dpp");

  return (
    db
      .select({
        ...relationshipResponseColumns,
        direction: sql<
          "incoming" | "outgoing"
        >`case when ${dppRelationships.sourceDppId} = ${dpp.id} then 'outgoing' else 'incoming' end`,
        sourceDigitalProductPassportId: source.digitalProductPassportId,
        sourceProductId: source.productId,
        sourcePublicId: source.publicId,
        targetPublicId: target.publicId,
      })
      .from(dppRelationships)
      // The source is always a passport of this tenant (foreign key); the
      // target may be a bare URN with no passport of its own — hence one
      // inner join and one left join.
      .innerJoin(source, eq(source.id, dppRelationships.sourceDppId))
      .leftJoin(target, eq(target.id, dppRelationships.targetDppId))
      .where(
        and(
          eq(dppRelationships.organizationId, organizationId),
          or(eq(dppRelationships.sourceDppId, dpp.id), eq(dppRelationships.targetDppId, dpp.id)),
        ),
      )
  );
}

// Columns are picked by hand, not `select()`: this feeds an anonymous response,
// and the row carries the tenant id, both internal DPP ids and free-text
// metadata. The response schema drops them anyway - but then the payload's shape
// would be an accident of the boundary rather than a decision here.
export async function listPublicOutgoingDppRelationships(
  db: Database,
  organizationId: string,
  sourceDppId: string,
) {
  return db
    .select({
      id: dppRelationships.id,
      relationshipType: dppRelationships.relationshipType,
      targetDigitalProductPassportId: dppRelationships.targetDigitalProductPassportId,
      targetProductId: dppRelationships.targetProductId,
      validFrom: dppRelationships.validFrom,
      visibility: dppRelationships.visibility,
    })
    .from(dppRelationships)
    .where(
      and(
        eq(dppRelationships.organizationId, organizationId),
        eq(dppRelationships.sourceDppId, sourceDppId),
        eq(dppRelationships.visibility, "public"),
      ),
    );
}
