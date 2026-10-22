import type { OrganizationRole } from "@dpp/domain";
import type { Context, MiddlewareHandler } from "hono";

import { auth } from "../auth.js";
import { env } from "../config.js";
import { jsonError } from "./result.js";
import { getActiveMembership } from "../services/organizations.js";

export type AppBindings = {
  Variables: {
    organizationId?: string;
    role?: OrganizationRole;
    session: typeof auth.$Infer.Session.session | null;
    user: typeof auth.$Infer.Session.user | null;
    userId?: string;
    // Set when the call came in via an API key . The tenant is then pinned
    // to the key rather than the header - an external system has no
    // organization selection, it has access to exactly one.
    apiKey?: { scopes: ApiScope[]; serviceAccountId: string };
  };
};

export type ApiScope = "read" | "write";

// Which methods count as reads. Everything else needs `write`, independent of
// role: the role says *what* someone is allowed to do, the scope says what
// this particular key may exercise of that. A key for the nightly import
// should not also be able to delete just because its account is an admin.
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function getRequiredOrganizationId(c: Context<AppBindings>) {
  // The verified organization is set by requireOrganizationMembership; never
  // trust the raw header directly.
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    throw new Error("Missing organization context");
  }

  return organizationId;
}

export function getOrganizationRole(c: Context<AppBindings>): OrganizationRole {
  const role = c.get("role");
  if (!role) {
    throw new Error("Missing organization role context");
  }

  return role;
}

export function getActorUserId(c: Context<AppBindings>) {
  return c.get("userId") ?? "system";
}

// The actor of a key-authenticated call in the audit log. The prefix makes it
// clear at a glance that no human acted here, while the identifier still
// resolves to the account it was.
export function serviceAccountActorId(serviceAccountId: string) {
  return `service-account:${serviceAccountId}`;
}

// Verifies the authenticated user is an active member of the organization named
// in the x-organization-id header before any org-scoped route runs, and pins
// the verified organizationId + role into the context. Enforces tenant
// isolation and is a prerequisite for role-based access control.
export const requireOrganizationMembership: MiddlewareHandler<AppBindings> = async (c, next) => {
  // A key-authenticated call already has its tenant and role from the key -
  // it *is* the membership. An organization header here would not just be
  // redundant but dangerous: it is client-controlled, and honoring it would
  // let a key switch tenants.
  if (c.get("apiKey")) {
    await next();
    return;
  }

  const organizationId = c.req.header("x-organization-id");
  if (!organizationId) {
    return jsonError(c, "Missing x-organization-id header", {
      code: "ORGANIZATION_REQUIRED",
      status: 400,
    });
  }

  const userId = c.get("userId");
  if (!userId) {
    return jsonError(c, "Authentication required", { code: "UNAUTHORIZED", status: 401 });
  }

  const membership = await getActiveMembership(organizationId, userId);
  if (!membership) {
    return jsonError(c, "Not an active member of this organization", {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  c.set("organizationId", organizationId);
  c.set("role", membership.role);
  await next();
};

// Route-level guard: an admin acting administratively must have a verified
// second factor (prEN 18239 5.2 no. 18-22). Off unless REQUIRE_ADMIN_TWO_FACTOR
// is set, because switching it on for an existing instance would lock out every
// admin who has not enrolled yet — enrolment must come first.
export const requireTwoFactor: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (!env.REQUIRE_ADMIN_TWO_FACTOR) {
    await next();
    return;
  }

  const user = c.get("user");
  // The enrolment endpoints live under /api/auth and never reach this guard, so
  // an un-enrolled admin can always still enrol.
  if (!user?.twoFactorEnabled) {
    return jsonError(
      c,
      "This action requires a second factor. Enable two-factor authentication for your account first.",
      { code: "TWO_FACTOR_REQUIRED", status: 403 },
    );
  }

  await next();
};

// Route-level guard: requires the caller's organization role to be one of the
// allowed roles. Must run after requireOrganizationMembership.
export const requireRole =
  (...roles: OrganizationRole[]): MiddlewareHandler<AppBindings> =>
  async (c, next) => {
    const role = c.get("role");
    if (!role || !roles.includes(role)) {
      return jsonError(c, "Insufficient permissions for this action", {
        code: "FORBIDDEN",
        status: 403,
      });
    }

    await next();
  };

export const attachAuthContext: MiddlewareHandler<AppBindings> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("session", null);
    c.set("user", null);
    await next();
    return;
  }

  c.set("session", session.session);
  c.set("user", session.user);
  c.set("userId", session.user.id);
  await next();
};

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (!c.get("user") && !c.get("apiKey")) {
    return jsonError(c, "Authentication required", { code: "UNAUTHORIZED", status: 401 });
  }

  await next();
};

// Checks a key's scope against the method. Runs after the tenant check and
// **in addition to** the role gate, not instead of it: both must agree. For
// session calls this is a pass-through - a human in the browser has no
// scopes, they have a role.
export const enforceApiKeyScope: MiddlewareHandler<AppBindings> = async (c, next) => {
  const apiKey = c.get("apiKey");
  if (!apiKey) {
    await next();
    return;
  }

  const needed: ApiScope = READ_METHODS.has(c.req.method) ? "read" : "write";
  if (!apiKey.scopes.includes(needed)) {
    return jsonError(c, `This API key does not carry the ${needed} scope`, {
      code: "SCOPE_REQUIRED",
      status: 403,
    });
  }

  await next();
};
