import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { env } from "../src/config.js";
import { addMember, createOrganization, signUpRaw } from "./helpers/client.js";

// prEN 18239 5.2 no. 18-22: a self-hosted instance must not let strangers
// register themselves into it. The suite runs with open signup so fixtures can
// mint users; these close it the way production does.
describe("registration gate", () => {
  afterEach(() => {
    env.ALLOW_OPEN_SIGNUP = true;
  });

  it("refuses an uninvited signup when open signup is off", async () => {
    env.ALLOW_OPEN_SIGNUP = false;

    const response = await signUpRaw(`stranger-${randomUUID()}@example.test`, "Stranger");

    expect(response.status).toBe(403);
    expect(response.body).toContain("REGISTRATION_INVITE_ONLY");
  });

  it("lets an invited user register and become a member immediately", async () => {
    const organization = await createOrganization("invite");
    env.ALLOW_OPEN_SIGNUP = false;

    // addMember invites first, then signs up — the create hook auto-accepts the
    // pending invitation, so the new user is active without a separate step.
    const editor = await addMember(organization, "editor");
    const response = await editor.get("/dpps");

    expect(response.status).toBe(200);
  });

  it("allows an uninvited signup when open signup is on", async () => {
    env.ALLOW_OPEN_SIGNUP = true;

    const response = await signUpRaw(`self-service-${randomUUID()}@example.test`, "Self Service");

    expect(response.status).toBe(200);
  });

  it("enforces the minimum password length", async () => {
    const response = await app.fetch(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `short-${randomUUID()}@example.test`,
          password: "tooshort",
          name: "Short Password",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
