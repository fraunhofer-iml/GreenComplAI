import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  anonymous,
  createOrganization,
  createUser,
  TestClient,
  type OrganizationFixture,
} from "./helpers/client.js";
import { createDraftDpp } from "./helpers/dpp.js";

// prEN 18239 5.2: an organization's data must never be reachable from another
// tenant. The header naming the organization is attacker-controlled, so every
// one of these asserts that the server checks membership rather than trusting it.
describe("tenant isolation", () => {
  let alpha: OrganizationFixture;
  let beta: OrganizationFixture;
  let alphaDppId: string;

  beforeAll(async () => {
    alpha = await createOrganization("alpha");
    beta = await createOrganization("beta");
    alphaDppId = (await createDraftDpp(alpha.admin)).publicId;
  });

  it("hides a DPP of another organization", async () => {
    const response = await beta.admin.get(`/dpps/${alphaDppId}/view`);

    expect(response.status).toBe(404);
  });

  it("rejects a member claiming an organization they do not belong to", async () => {
    // The header is the only thing the client controls here — beta's admin is a
    // real, authenticated user, just not a member of alpha.
    const impersonating = beta.admin.forOrganization(alpha.id);
    const response = await impersonating.get("/dpps");

    expect(response.status).toBe(403);
  });

  it("rejects an authenticated user with no membership at all", async () => {
    const outsider = new TestClient(await createUser("outsider"), alpha.id);
    const response = await outsider.get("/dpps");

    expect(response.status).toBe(403);
  });

  it("rejects a request without an organization header", async () => {
    const withoutOrganization = new TestClient(alpha.admin.user);
    const response = await withoutOrganization.get("/dpps");

    expect(response.status).toBe(400);
  });

  it("rejects an anonymous request to a tenant route", async () => {
    const response = await anonymous.get("/dpps");

    expect(response.status).toBe(401);
  });

  it("does not leak another tenant's DPP through the list", async () => {
    await createDraftDpp(beta.admin);

    const list = await beta.admin.get<{ result: { dpps: { publicId: string }[] } }>("/dpps");

    expect(list.status).toBe(200);
    expect(list.body.result.dpps.map((dpp) => dpp.publicId)).not.toContain(alphaDppId);
  });

  it("does not let another tenant patch a DPP", async () => {
    const response = await beta.admin.patch(`/dpps/${alphaDppId}`, {
      snapshot: { granularity: "hijacked" },
    });

    expect(response.status).toBe(404);
  });

  it("does not let another tenant transition a DPP", async () => {
    const response = await beta.admin.put(`/dpps/${alphaDppId}/status`, { status: "review" });

    expect(response.status).toBe(404);
  });

  it("scopes members to their own organization", async () => {
    await addMember(alpha, "editor");

    const alphaMembers = await alpha.admin.get<{ result: { email: string }[] }>("/members");
    const betaMembers = await beta.admin.get<{ result: { email: string }[] }>("/members");

    const alphaEmails = alphaMembers.body.result.map((member) => member.email);
    const betaEmails = betaMembers.body.result.map((member) => member.email);

    expect(alphaEmails.length).toBeGreaterThan(1);
    for (const email of betaEmails) {
      expect(alphaEmails).not.toContain(email);
    }
  });

  it("only lists the organizations a user is a member of", async () => {
    const response = await alpha.admin.get<{ organizations: { id: string }[] }>("/organizations");

    const ids = response.body.organizations.map((organization) => organization.id);
    expect(ids).toContain(alpha.id);
    expect(ids).not.toContain(beta.id);
  });
});
