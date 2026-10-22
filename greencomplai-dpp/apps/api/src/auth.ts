import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";

import { acceptPendingInvitationsForEmail, hasPendingInvitationForEmail, schema } from "@dpp/db";

import { env } from "./config.js";
import { db } from "./db.js";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    // Strong-ish password policy; step-up MFA for privileged/controlled access
    // is tracked as a follow-up (see plan +/M1).
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  session: {
    // Validate the session from the signed cookie instead of hitting the DB on
    // every request. Kept short: a revoked session (or a freshly enrolled second
    // factor, which requireTwoFactor reads off the cached user) stays stale for
    // at most this long. Organization membership and role are unaffected --
    // requireOrganizationMembership looks those up per request.
    cookieCache: { enabled: true, maxAge: 60 },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the session at most once per day
    freshAge: 60 * 60, // require a <1h-old session for sensitive operations
  },
  databaseHooks: {
    user: {
      create: {
        // Invite-only registration: unless open signup is explicitly enabled,
        // an account may only be created for an email that was invited.
        before: async (user) => {
          if (env.ALLOW_OPEN_SIGNUP) return;
          const invited = await hasPendingInvitationForEmail(db, user.email);
          if (!invited) {
            throw new APIError("FORBIDDEN", {
              code: "REGISTRATION_INVITE_ONLY",
              message: "Registration is invite-only. Ask an administrator for an invitation.",
            });
          }
        },
        // Turn the invitations that permitted this signup into active
        // memberships, so the new user is immediately part of their org(s).
        after: async (user) => {
          await acceptPendingInvitationsForEmail(db, user.email, user.id);
        },
      },
    },
  },
  plugins: [
    // TOTP second factor . Enrolment is self-service; enforcement for
    // privileged operations lives in the route guards (requireTwoFactor), not
    // here — Better Auth only decides whether a factor was presented at sign-in.
    twoFactor({
      issuer: env.TWO_FACTOR_ISSUER,
    }),
  ],
  trustedOrigins: [...env.WEB_ORIGINS, env.API_ORIGIN],
  // Without a Domain attribute the session cookie is host-only, so a frontend on
  // a sibling subdomain never receives it and its server-side route guard cannot
  // see a session. Setting SESSION_COOKIE_DOMAIN widens the cookie to that
  // parent domain. Choose it as narrowly as the deployment allows: every host
  // under it receives the cookie on each request, so a hostile application on a
  // sibling subdomain could replay the token. Unset (the default, and the case
  // for local development where both run on localhost) nothing changes.
  ...(env.SESSION_COOKIE_DOMAIN
    ? {
        advanced: {
          crossSubDomainCookies: {
            enabled: true,
            domain: env.SESSION_COOKIE_DOMAIN,
          },
        },
      }
    : {}),
});
