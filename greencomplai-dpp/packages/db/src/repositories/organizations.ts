import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../index.js";
import { organizationMemberships, organizations } from "../schema.js";

type CreateOrganizationInput = {
  name: string;
  slug: string;
};

// Only organizations the user is an active member of. Prevents cross-tenant
// metadata disclosure via the organization list.
export async function listOrganizationsForUser(db: Database, userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      role: organizationMemberships.role,
    })
    .from(organizations)
    .innerJoin(
      organizationMemberships,
      eq(organizationMemberships.organizationId, organizations.id),
    )
    .where(
      and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.status, "active")),
    )
    .orderBy(asc(organizations.name));
}

// Creates an organization and, atomically, an active admin membership for the
// creating user so the new tenant is immediately accessible to its creator.
export async function createOrganization(
  db: Database,
  input: CreateOrganizationInput,
  creatorUserId: string,
) {
  return db.transaction(async (tx) => {
    // Same columns the list returns. `status` is deliberately not among them:
    // it is SaaS tenant lifecycle (M7) that nothing reads yet, and returning it
    // here but not from GET /organizations would make one resource have two
    // shapes depending on how you got it.
    const [organization] = await tx.insert(organizations).values(input).returning({
      createdAt: organizations.createdAt,
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      updatedAt: organizations.updatedAt,
    });
    if (!organization) {
      throw new Error("Failed to create organization");
    }

    await tx.insert(organizationMemberships).values({
      organizationId: organization.id,
      userId: creatorUserId,
      role: "admin",
      status: "active",
    });

    // With `role`: the list carries it, the create response left it out -
    // exactly the "two shapes of one resource" the comment above tries to
    // avoid. The value is fixed anyway; the line right above just created it.
    return { ...organization, role: "admin" as const };
  });
}

// Returns the caller's active membership in the given organization, or
// undefined if they are not an active member or the organization itself is not
// active (suspended/deleted). Used to enforce tenant isolation.
export async function findActiveMembership(db: Database, organizationId: string, userId: string) {
  const [membership] = await db
    .select({
      organizationId: organizationMemberships.organizationId,
      userId: organizationMemberships.userId,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "active"),
        eq(organizations.status, "active"),
      ),
    )
    .limit(1);

  return membership;
}

export async function findOrganizationById(db: Database, organizationId: string) {
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return row;
}

// All tenant ids, for jobs that sweep the whole instance.
export async function listOrganizationIds(db: Database): Promise<string[]> {
  const rows = await db.select({ id: organizations.id }).from(organizations);
  return rows.map((row) => row.id);
}
