import { and, desc, eq, gt, sql } from "drizzle-orm";

import type { Database } from "../index.js";
import {
  auditEvents,
  organizationInvitations,
  organizationMemberships,
  session,
  user,
} from "../schema.js";

type OrganizationRole = "admin" | "editor" | "viewer" | "authority";
type MembershipStatus = "invited" | "active" | "disabled";

// The shape a member is reported in — one definition, so a member read after a
// write is the same member the list shows.
const memberColumns = {
  userId: organizationMemberships.userId,
  role: organizationMemberships.role,
  status: organizationMemberships.status,
  name: user.name,
  email: user.email,
  createdAt: organizationMemberships.createdAt,
  updatedAt: organizationMemberships.updatedAt,
};

// Lists every membership of an organization joined with the user's identity so
// an admin can see who has access, in which role and with what status.
export async function listOrganizationMembers(db: Database, organizationId: string) {
  return db
    .select(memberColumns)
    .from(organizationMemberships)
    .leftJoin(user, eq(user.id, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, organizationId))
    .orderBy(desc(organizationMemberships.createdAt));
}

// One member in the same shape as the list. `getMembership` below reads the raw
// row for authorization decisions; this one is what a response is built from.
export async function findOrganizationMember(db: Database, organizationId: string, userId: string) {
  const [member] = await db
    .select(memberColumns)
    .from(organizationMemberships)
    .leftJoin(user, eq(user.id, organizationMemberships.userId))
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, userId),
      ),
    )
    .limit(1);

  return member;
}

export async function getMembership(db: Database, organizationId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, userId),
      ),
    )
    .limit(1);

  return membership;
}

// Number of members who can still administer the organization. Used to prevent
// an admin from demoting/disabling the last remaining admin and locking the
// tenant out of management.
export async function countActiveAdmins(db: Database, organizationId: string): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.role, "admin"),
        eq(organizationMemberships.status, "active"),
      ),
    );

  return row?.value ?? 0;
}

export async function updateMembershipRole(
  db: Database,
  input: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
    actorUserId: string;
  },
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(organizationMemberships)
      .set({ role: input.role, updatedAt: new Date() })
      .where(
        and(
          eq(organizationMemberships.organizationId, input.organizationId),
          eq(organizationMemberships.userId, input.userId),
        ),
      )
      .returning();

    if (!updated) return undefined;

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "organization.member_updated",
      objectType: "organization_membership",
      objectId: input.userId,
      changedProperties: ["role"],
      patch: { role: input.role },
    });

    return updated;
  });
}

// Changes a membership's status (active/disabled). Disabling a member also
// deletes their sessions so access is revoked immediately, not only on the next
// login.
export async function setMembershipStatus(
  db: Database,
  input: {
    organizationId: string;
    userId: string;
    status: MembershipStatus;
    actorUserId: string;
  },
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(organizationMemberships)
      .set({ status: input.status, updatedAt: new Date() })
      .where(
        and(
          eq(organizationMemberships.organizationId, input.organizationId),
          eq(organizationMemberships.userId, input.userId),
        ),
      )
      .returning();

    if (!updated) return undefined;

    if (input.status === "disabled") {
      await tx.delete(session).where(eq(session.userId, input.userId));
    }

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "organization.member_updated",
      objectType: "organization_membership",
      objectId: input.userId,
      changedProperties: ["status"],
      patch: { status: input.status },
    });

    return updated;
  });
}

export async function createInvitation(
  db: Database,
  input: {
    organizationId: string;
    email: string;
    role: OrganizationRole;
    token: string;
    invitedByUserId: string;
    expiresAt: Date;
  },
) {
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .insert(organizationInvitations)
      .values({
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        token: input.token,
        invitedByUserId: input.invitedByUserId,
        expiresAt: input.expiresAt,
      })
      .returning();

    if (!invitation) throw new Error("Failed to create invitation");

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.invitedByUserId,
      eventType: "organization.member_invited",
      objectType: "organization_invitation",
      objectId: invitation.id,
      changedProperties: ["email", "role"],
      patch: { email: input.email, role: input.role },
    });

    return invitation;
  });
}

export async function listInvitations(
  db: Database,
  organizationId: string,
  options: { status?: "pending" | "accepted" | "revoked" } = {},
) {
  const conditions = [eq(organizationInvitations.organizationId, organizationId)];
  if (options.status) conditions.push(eq(organizationInvitations.status, options.status));

  return db
    .select({
      id: organizationInvitations.id,
      email: organizationInvitations.email,
      role: organizationInvitations.role,
      status: organizationInvitations.status,
      invitedByUserId: organizationInvitations.invitedByUserId,
      expiresAt: organizationInvitations.expiresAt,
      createdAt: organizationInvitations.createdAt,
    })
    .from(organizationInvitations)
    .where(and(...conditions))
    .orderBy(desc(organizationInvitations.createdAt));
}

export async function revokeInvitation(
  db: Database,
  input: { organizationId: string; invitationId: string; actorUserId: string },
) {
  return db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(organizationInvitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(
        and(
          eq(organizationInvitations.id, input.invitationId),
          eq(organizationInvitations.organizationId, input.organizationId),
          eq(organizationInvitations.status, "pending"),
        ),
      )
      .returning();

    if (!revoked) return undefined;

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: "organization.member_invited",
      objectType: "organization_invitation",
      objectId: revoked.id,
      changedProperties: ["status"],
      patch: { status: "revoked" },
    });

    return revoked;
  });
}

// True if there is at least one unexpired, pending invitation for this email.
// Used to gate invite-only self-service registration.
export async function hasPendingInvitationForEmail(db: Database, email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: organizationInvitations.id })
    .from(organizationInvitations)
    .where(
      and(
        eq(organizationInvitations.email, email.trim().toLowerCase()),
        eq(organizationInvitations.status, "pending"),
        gt(organizationInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return Boolean(row);
}

// Consumes every unexpired pending invitation for an email once the invited
// person has created their account, so a fresh signup is immediately an active
// member of the organizations that invited them (auto-accept on registration).
export async function acceptPendingInvitationsForEmail(
  db: Database,
  email: string,
  userId: string,
) {
  const normalized = email.trim().toLowerCase();
  const pending = await db
    .select()
    .from(organizationInvitations)
    .where(
      and(
        eq(organizationInvitations.email, normalized),
        eq(organizationInvitations.status, "pending"),
        gt(organizationInvitations.expiresAt, new Date()),
      ),
    );

  for (const invitation of pending) {
    await acceptInvitation(db, {
      invitationId: invitation.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
      userId,
    });
  }

  return pending.length;
}

export async function findInvitationByToken(db: Database, token: string) {
  const [invitation] = await db
    .select()
    .from(organizationInvitations)
    .where(eq(organizationInvitations.token, token))
    .limit(1);

  return invitation;
}

// Transactionally consumes a validated invitation: marks it accepted and
// upserts an active membership (re-activating a previously disabled one). The
// caller must have already verified the token is pending, unexpired and matches
// the accepting user's email.
export async function acceptInvitation(
  db: Database,
  input: { invitationId: string; organizationId: string; role: OrganizationRole; userId: string },
) {
  return db.transaction(async (tx) => {
    await tx
      .insert(organizationMemberships)
      .values({
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [organizationMemberships.organizationId, organizationMemberships.userId],
        set: { role: input.role, status: "active", updatedAt: new Date() },
      });

    await tx
      .update(organizationInvitations)
      .set({
        status: "accepted",
        acceptedByUserId: input.userId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationInvitations.id, input.invitationId));

    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      eventType: "organization.member_updated",
      objectType: "organization_membership",
      objectId: input.userId,
      changedProperties: ["status", "role"],
      patch: { status: "active", role: input.role },
    });
  });
}
