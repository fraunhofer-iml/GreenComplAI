import { createHmac } from "node:crypto";

import { twoFactor, user } from "@dpp/db/schema";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { env } from "../src/config.js";
import { db } from "../src/db.js";
import { addMember, createOrganization, PASSWORD, TestClient } from "./helpers/client.js";

// a second factor gates the administrative surface. Enforcement is a
// deployment decision (REQUIRE_ADMIN_TWO_FACTOR), because turning it on for an
// instance whose admins have not enrolled yet would lock them out.
describe("two-factor enforcement", () => {
  afterEach(() => {
    env.REQUIRE_ADMIN_TWO_FACTOR = false;
  });

  it("leaves admin routes open when enforcement is off", async () => {
    const organization = await createOrganization("mfa-off");

    const response = await organization.admin.get("/members");

    expect(response.status).toBe(200);
  });

  it("blocks admin routes for an admin without a second factor", async () => {
    const organization = await createOrganization("mfa-on");
    env.REQUIRE_ADMIN_TWO_FACTOR = true;

    const response = await organization.admin.get<{ messages: { code?: string }[] }>("/members");

    expect(response.status).toBe(403);
    expect(response.body.messages[0]?.code).toBe("TWO_FACTOR_REQUIRED");
  });

  it("blocks inviting without a second factor", async () => {
    const organization = await createOrganization("mfa-invite");
    env.REQUIRE_ADMIN_TWO_FACTOR = true;

    const response = await organization.admin.post("/invitations", {
      email: "someone@example.test",
      role: "editor",
    });

    expect(response.status).toBe(403);
  });

  it("lets an enrolled admin through", async () => {
    const organization = await createOrganization("mfa-enrolled");
    // Enrolment itself runs through Better Auth's own endpoints; what the guard
    // reads is the flag they set once a code has been verified.
    await db
      .update(user)
      .set({ twoFactorEnabled: true })
      .where(eq(user.id, organization.admin.user.id));
    env.REQUIRE_ADMIN_TWO_FACTOR = true;

    const response = await organization.admin.get("/members");

    expect(response.status).toBe(200);
  });

  it("does not gate ordinary DPP work behind a second factor", async () => {
    const organization = await createOrganization("mfa-editor");
    const editor = await addMember(organization, "editor");
    env.REQUIRE_ADMIN_TWO_FACTOR = true;

    // The guard protects administration, not everyday editing — an editor
    // without MFA must still be able to do their job.
    const response = await editor.get("/dpps");

    expect(response.status).toBe(200);
  });

  it("keeps the enrolment endpoints reachable so an admin can get unblocked", async () => {
    const organization = await createOrganization("mfa-enrol-path");
    env.REQUIRE_ADMIN_TWO_FACTOR = true;

    // /api/auth/* never passes through the guard: an admin locked out of
    // /members must still be able to enrol.
    const response = await organization.admin.get("/api/auth/get-session");

    expect(response.status).toBe(200);
  });
});

// Generate the standard TOTP from the enrolment URI, independently of Better Auth.
function totpCode(uri: string): string {
  const secret = new URL(uri).searchParams.get("secret");
  if (!secret) throw new Error("The enrolment URI has no secret");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "").toUpperCase()]
    .map((char) => {
      const value = alphabet.indexOf(char);
      if (value < 0) throw new Error("Invalid base32 secret");
      return value.toString(2).padStart(5, "0");
    })
    .join("");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

describe("two-factor enrolment and sign-in", () => {
  it("tracks failed TOTP sign-in attempts and clears them after successful verification", async () => {
    const organization = await createOrganization("mfa-upgrade");
    const enabled = await organization.admin.post<{
      method: string;
      totpURI: string;
      backupCodes: string[];
    }>("/api/auth/two-factor/enable", { password: PASSWORD });
    expect(enabled.status).toBe(200);
    expect(enabled.body.method).toBe("totp");
    expect(enabled.body.backupCodes.length).toBeGreaterThan(0);

    const enrolled = await organization.admin.post("/api/auth/two-factor/verify-totp", {
      code: totpCode(enabled.body.totpURI),
    });
    expect(enrolled.status).toBe(200);

    const signIn = await app.fetch(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: organization.admin.user.email, password: PASSWORD }),
      }),
    );
    expect(signIn.status).toBe(200);
    expect(await signIn.json()).toMatchObject({ twoFactorRedirect: true });
    const challengeCookie = signIn.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    const challenge = new TestClient({ ...organization.admin.user, cookie: challengeCookie });
    const invalid = await challenge.post("/api/auth/two-factor/verify-totp", { code: "invalid" });
    expect(invalid.status).toBe(401);
    const [attempted] = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, organization.admin.user.id));
    expect(attempted?.failedVerificationCount).toBe(1);

    const verified = await challenge.post("/api/auth/two-factor/verify-totp", {
      code: totpCode(enabled.body.totpURI),
    });
    expect(verified.status).toBe(200);
    const [factor] = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, organization.admin.user.id));
    expect(factor?.verified).toBe(true);
    expect(factor?.failedVerificationCount).toBe(0);
    expect(factor?.lockedUntil).toBeNull();
  });
});
