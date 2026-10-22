import {
  acceptedInvitationResponseSchema,
  createOrganizationSchema,
  organizationResponseSchema,
  organizationsResponseSchema,
} from "@dpp/schemas";
import { zValidator } from "../http/validator.js";
import { Hono } from "hono";

import type { AppBindings } from "../http/context.js";
import { getActorUserId } from "../http/context.js";
import { jsonResponse } from "../http/response.js";
import { jsonError } from "../http/result.js";
import { acceptOrganizationInvitation } from "../services/members.js";
import { getOrganizations, registerOrganization } from "../services/organizations.js";

export const organizationRoutes = new Hono<AppBindings>()
  .get("/organizations", async (c) => {
    return jsonResponse(c, organizationsResponseSchema, await getOrganizations(getActorUserId(c)), {
      context: "GET /organizations",
      key: "organizations",
    });
  })
  .post("/organizations", zValidator("json", createOrganizationSchema), async (c) => {
    const organization = await registerOrganization(c.req.valid("json"), getActorUserId(c));
    return jsonResponse(c, organizationResponseSchema, organization, {
      context: "POST /organizations",
      key: "organization",
      status: 201,
    });
  })
  // Accepting creates the acceptance of a specific invitation, which the token
  // in the path identifies. Accepting cannot require an existing membership —
  // that is what is being granted — so this lives in the auth-only block, before
  // requireOrganizationMembership.
  .post("/invitations/:token/acceptance", async (c) => {
    const outcome = await acceptOrganizationInvitation(
      getActorUserId(c),
      c.get("user")?.email,
      c.req.param("token"),
    );
    if (!outcome.ok) {
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }
    return jsonResponse(c, acceptedInvitationResponseSchema, outcome.value, {
      context: "POST /invitations/:token/acceptance",
      key: "result",
      status: 201,
    });
  });
