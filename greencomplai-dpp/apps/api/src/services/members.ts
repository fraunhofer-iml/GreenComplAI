import { randomUUID } from "node:crypto";

import {
  acceptInvitation,
  findOrganizationById,
  countActiveAdmins,
  createInvitation,
  findInvitationByToken,
  findOrganizationMember,
  getMembership,
  listInvitations,
  listOrganizationMembers,
  revokeInvitation,
  setMembershipStatus,
  updateMembershipRole,
} from "@dpp/db";
import type { OrganizationRole } from "@dpp/domain";

import { env } from "../config.js";
import { db } from "../db.js";
import { invitationMail, sendMail } from "./mail.js";

type ServiceResult<T> =
  | { ok: true; value: T }
  | { code: string; message: string; ok: false; status: 400 | 403 | 404 | 409 | 410 };

const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function fail(
  status: 400 | 403 | 404 | 409 | 410,
  code: string,
  message: string,
): ServiceResult<never> {
  return { ok: false, status, code, message };
}

export async function listMembers(organizationId: string) {
  return { ok: true, value: await listOrganizationMembers(db, organizationId) } as const;
}

export async function listOrganizationInvitations(organizationId: string) {
  return {
    ok: true,
    value: await listInvitations(db, organizationId, { status: "pending" }),
  } as const;
}

export async function inviteMember(
  organizationId: string,
  actorUserId: string,
  input: { email: string; role: OrganizationRole },
): Promise<
  ServiceResult<{
    id: string;
    token: string;
    email: string;
    role: OrganizationRole;
    mailDelivered: boolean;
  }>
> {
  const email = input.email.trim().toLowerCase();
  const token = randomUUID();
  const invitation = await createInvitation(db, {
    organizationId,
    email,
    role: input.role,
    token,
    invitedByUserId: actorUserId,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  const organization = await findOrganizationById(db, organizationId);
  // Delivery is best-effort and deliberately after the invitation exists: a
  // missing SMTP server (the self-hosted default) must not make inviting fail.
  // The admin keeps the copyable link either way, which is why the outcome is
  // reported rather than thrown.
  const mail = await sendMail(
    invitationMail({
      email,
      inviteUrl: buildInviteUrl(token),
      organizationName: nameOf(organization?.name) ?? "der Organisation",
      role: input.role,
    }),
  );

  return {
    ok: true,
    value: {
      id: invitation.id,
      token: invitation.token,
      email,
      role: input.role,
      mailDelivered: mail.delivered,
    },
  };
}

// The invite link points at the web app, not the API: the first WEB_ORIGINS
// entry is the canonical one.
function buildInviteUrl(token: string): string {
  const origin = env.WEB_ORIGINS[0] ?? env.WEB_ORIGIN;
  return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
}

// Organization names are translatable objects; fall back across locales rather
// than rendering "[object Object]" into an email.
function nameOf(name: unknown): string | undefined {
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    const translations = name as Record<string, unknown>;
    for (const value of [translations.de, translations.en, ...Object.values(translations)]) {
      if (typeof value === "string" && value) return value;
    }
  }
  return undefined;
}

export async function revokeOrganizationInvitation(
  organizationId: string,
  actorUserId: string,
  invitationId: string,
): Promise<ServiceResult<{ id: string }>> {
  const revoked = await revokeInvitation(db, { organizationId, invitationId, actorUserId });
  if (!revoked) return fail(404, "INVITATION_NOT_FOUND", "No pending invitation with this id");
  return { ok: true, value: { id: revoked.id } };
}

// Both mutations below answer with the member as `GET /members` reports them,
// read back through the same query after the write: the endpoint's response
// schema describes a member, and returning a two-field stand-in made every
// successful role/status change fail at the response boundary (500).
type Member = NonNullable<Awaited<ReturnType<typeof findOrganizationMember>>>;

export async function changeMemberRole(
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
  role: OrganizationRole,
): Promise<ServiceResult<Member>> {
  const membership = await getMembership(db, organizationId, targetUserId);
  if (!membership)
    return fail(404, "MEMBER_NOT_FOUND", "User is not a member of this organization");

  const lockout = await wouldStrandOrganization(organizationId, membership, {
    nextRole: role,
    nextStatus: membership.status,
  });
  if (lockout) return lockout;

  const updated = await updateMembershipRole(db, {
    organizationId,
    userId: targetUserId,
    role,
    actorUserId,
  });
  if (!updated) return fail(404, "MEMBER_NOT_FOUND", "User is not a member of this organization");

  return readMember(organizationId, targetUserId);
}

export async function changeMemberStatus(
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
  status: "active" | "disabled",
): Promise<ServiceResult<Member>> {
  if (status === "disabled" && targetUserId === actorUserId) {
    return fail(409, "CANNOT_DISABLE_SELF", "You cannot disable your own membership");
  }

  const membership = await getMembership(db, organizationId, targetUserId);
  if (!membership)
    return fail(404, "MEMBER_NOT_FOUND", "User is not a member of this organization");

  const lockout = await wouldStrandOrganization(organizationId, membership, {
    nextRole: membership.role,
    nextStatus: status,
  });
  if (lockout) return lockout;

  const updated = await setMembershipStatus(db, {
    organizationId,
    userId: targetUserId,
    status,
    actorUserId,
  });
  if (!updated) return fail(404, "MEMBER_NOT_FOUND", "User is not a member of this organization");

  return readMember(organizationId, targetUserId);
}

async function readMember(organizationId: string, userId: string): Promise<ServiceResult<Member>> {
  const member = await findOrganizationMember(db, organizationId, userId);
  if (!member) return fail(404, "MEMBER_NOT_FOUND", "User is not a member of this organization");
  return { ok: true, value: member };
}

export async function acceptOrganizationInvitation(
  actorUserId: string,
  actorEmail: string | undefined,
  token: string,
): Promise<ServiceResult<{ organizationId: string; role: OrganizationRole }>> {
  const invitation = await findInvitationByToken(db, token);
  if (!invitation || invitation.status !== "pending") {
    return fail(404, "INVITATION_NOT_FOUND", "Invitation not found or already used");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    return fail(410, "INVITATION_EXPIRED", "This invitation has expired");
  }
  if (!actorEmail || actorEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    return fail(
      403,
      "INVITATION_EMAIL_MISMATCH",
      "This invitation was issued for a different email",
    );
  }

  await acceptInvitation(db, {
    invitationId: invitation.id,
    organizationId: invitation.organizationId,
    role: invitation.role,
    userId: actorUserId,
  });

  return { ok: true, value: { organizationId: invitation.organizationId, role: invitation.role } };
}

// Guards against locking a tenant out of administration: the last active admin
// may not be demoted or disabled.
async function wouldStrandOrganization(
  organizationId: string,
  membership: { role: OrganizationRole; status: string },
  next: { nextRole: OrganizationRole; nextStatus: string },
): Promise<ServiceResult<never> | null> {
  const wasActiveAdmin = membership.role === "admin" && membership.status === "active";
  const staysActiveAdmin = next.nextRole === "admin" && next.nextStatus === "active";
  if (!wasActiveAdmin || staysActiveAdmin) return null;

  const activeAdmins = await countActiveAdmins(db, organizationId);
  if (activeAdmins <= 1) {
    return fail(
      409,
      "LAST_ADMIN",
      "Cannot demote or disable the last active administrator of this organization",
    );
  }

  return null;
}
