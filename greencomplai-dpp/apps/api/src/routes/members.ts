import {
  createdInvitationResponseSchema,
  invitationsResponseSchema,
  inviteMemberSchema,
  memberResponseSchema,
  membersResponseSchema,
  patchMemberSchema,
  revokedInvitationResponseSchema,
} from "@dpp/schemas";
import { zValidator } from "../http/validator.js";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

import type { AppBindings } from "../http/context.js";
import { getActorUserId, requireRole, requireTwoFactor } from "../http/context.js";
import { getOrganizationOrError } from "../http/organization.js";
import { jsonResponse } from "../http/response.js";
import { jsonError } from "../http/result.js";
import {
  changeMemberRole,
  changeMemberStatus,
  inviteMember,
  listMembers,
  listOrganizationInvitations,
  revokeOrganizationInvitation,
} from "../services/members.js";

// All member/invitation management is reserved for organization admins
// (prEN 18239 5.2 no. 18-22, 6.3) and, where the instance demands it, to admins
// who carry a second factor .
export const memberRoutes = new Hono<AppBindings>()
  .use("/members/*", requireTwoFactor)
  .use("/members", requireTwoFactor)
  .use("/invitations/*", requireTwoFactor)
  .use("/invitations", requireTwoFactor)
  .get("/members", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;
    return respond(c, membersResponseSchema, await listMembers(organizationId), "GET /members");
  })
  // One PATCH for the membership. Role and status are applied in that order and
  // each keeps its own guard — demoting the last admin and disabling the last
  // admin are both refused, so a patch doing both cannot sneak past either.
  .patch(
    "/members/:userId",
    requireRole("admin"),
    zValidator("json", patchMemberSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const { role, status } = c.req.valid("json");
      const userId = c.req.param("userId");
      const actorUserId = getActorUserId(c);

      const context = "PATCH /members/:userId";
      if (role) {
        const outcome = await changeMemberRole(organizationId, actorUserId, userId, role);
        // Stop on the first refusal rather than applying half the patch.
        if (!outcome.ok || !status) return respond(c, memberResponseSchema, outcome, context);
      }

      // The schema guarantees at least one of role/status, so status is set here
      // whenever role was not.
      return respond(
        c,
        memberResponseSchema,
        await changeMemberStatus(organizationId, actorUserId, userId, status!),
        context,
      );
    },
  )
  .get("/invitations", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;
    return respond(
      c,
      invitationsResponseSchema,
      await listOrganizationInvitations(organizationId),
      "GET /invitations",
    );
  })
  .post("/invitations", requireRole("admin"), zValidator("json", inviteMemberSchema), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;
    return respond(
      c,
      createdInvitationResponseSchema,
      await inviteMember(organizationId, getActorUserId(c), c.req.valid("json")),
      "POST /invitations",
      201,
    );
  })
  .delete("/invitations/:invitationId", requireRole("admin"), async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;
    return respond(
      c,
      revokedInvitationResponseSchema,
      await revokeOrganizationInvitation(
        organizationId,
        getActorUserId(c),
        c.req.param("invitationId"),
      ),
      "DELETE /invitations/:invitationId",
    );
  });

type ServiceResult<T> =
  | { ok: true; value: T }
  | { code: string; message: string; ok: false; status: ContentfulStatusCode };

// Sends a service outcome through its response schema. The schema is the
// outbound boundary: it decides what a member or an invitation looks like on the
// wire, rather than the repository's column list deciding it by accident.
function respond<T>(
  c: Context<AppBindings>,
  schema: ZodType<T>,
  outcome: ServiceResult<unknown>,
  context: string,
  successStatus: ContentfulStatusCode = 200,
) {
  if (!outcome.ok) {
    return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
  }

  return jsonResponse(c, schema, outcome.value, { context, key: "result", status: successStatus });
}
