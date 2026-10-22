import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { resetDropReporting } from "../src/http/response.js";
import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp } from "./helpers/dpp.js";

// The response schemas strip anything they do not name — that is the boundary,
// and it holds. This asserts the *other* half: that nothing is being stripped in
// normal operation.
//
// A steady stream of drops would mean the queries and the schemas disagree about
// what a payload contains, and the warning meant to flag a leak would be firing
// constantly for fields we already know about. Silence here is what keeps that
// warning worth reading — the day it fires, something genuinely new appeared.
describe("response drift", () => {
  let organization: OrganizationFixture;
  let member: TestClient;
  let dppId: string;
  const suffix = randomUUID().slice(0, 8);
  const repositoryKey = `drift-${suffix}`;
  const operatorId = `OP-${suffix}`;
  const productId = `product-${suffix}`;

  beforeAll(async () => {
    organization = await createOrganization("drift");

    await organization.admin.post("/economic-operators", {
      operatorId,
      legalName: "Drift GmbH",
      roles: ["manufacturer"],
    });
    await organization.admin.post("/data-dictionary-repositories", {
      repositoryKey,
      name: { de: "Drift" },
      namespaceUri: `https://dictionary.test/${repositoryKey}/2026.1/`,
      version: "2026.1",
      status: "active",
    });
    await organization.admin.post(`/data-dictionary-repositories/${repositoryKey}/entries`, {
      entryKey: "weight",
      name: { de: "Gewicht" },
      valueType: "string",
      visibility: "public",
      required: false,
    });
    await organization.admin.post("/products", {
      productId,
      name: { de: "Driftprodukt" },
      lifecycleStatus: "active",
      identifiers: { gtin: "04012345678901" },
    });
    member = await addMember(organization, "editor");
    dppId = (await createDraftDpp(organization.admin)).publicId;
  });

  it("serves every route without dropping a field", async () => {
    const drops: string[] = [];
    // The reporter only warns once per route+field set, so a previous test file
    // could have already swallowed the warning this one is looking for.
    resetDropReporting();
    vi.spyOn(console, "warn").mockImplementation((message: unknown) => {
      if (typeof message === "string" && message.startsWith("[response]")) drops.push(message);
    });

    await organization.admin.patch(`/economic-operators/${operatorId}`, { countryCode: "DE" });
    await organization.admin.patch(`/data-dictionary-repositories/${repositoryKey}`, {
      publisher: "Drift e.V.",
    });
    await organization.admin.patch(
      `/data-dictionary-repositories/${repositoryKey}/entries/weight`,
      { unit: "kg" },
    );
    await organization.admin.patch(`/products/${productId}`, { category: "test" });
    await organization.admin.post("/facilities", {
      facilityId: `WERK-${suffix}`,
      name: "Driftwerk",
      operatorId,
    });
    await organization.admin.patch(`/facilities/WERK-${suffix}`, { countryCode: "DE" });
    await organization.admin.post("/invitations", {
      email: `drift-${randomUUID()}@example.test`,
      role: "editor",
    });
    // A write route left out of this sweep once shipped a 500: the handler
    // answered with a two-field stand-in that its member schema could not
    // satisfy. Undernaming fails loudly rather than as a drop, so it is asserted
    // on the status too.
    const patchedMember = await organization.admin.patch(`/members/${member.user.id}`, {
      role: "viewer",
    });
    expect(patchedMember.status).toBe(200);

    for (const path of [
      "/products",
      `/products/${productId}`,
      "/economic-operators",
      `/economic-operators/${operatorId}`,
      "/facilities",
      `/facilities/WERK-${suffix}`,
      "/data-dictionary-repositories",
      `/data-dictionary-repositories/${repositoryKey}`,
      `/data-dictionary-repositories/${repositoryKey}/entries`,
      `/data-dictionary-repositories/${repositoryKey}/entries/weight`,
      "/dpps",
      `/dpps/${dppId}`,
      `/dpps/${dppId}/view`,
      `/dpps/${dppId}/versions`,
      `/dpps/${dppId}/audit-events`,
      `/dpps/${dppId}/timeline`,
      `/dpps/${dppId}/validation`,
      `/dpps/${dppId}/relationships`,
      "/organizations",
      "/members",
      "/invitations",
    ]) {
      await organization.admin.get(path);
    }

    expect(drops).toEqual([]);
  });
});
