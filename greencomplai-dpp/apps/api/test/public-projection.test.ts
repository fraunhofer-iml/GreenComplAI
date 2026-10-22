import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { anonymous, createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { controlledElement, createDraftDpp, publicElement, publishDpp } from "./helpers/dpp.js";

type PublicPayload = {
  dpp: { dataElements: { elementId: string; value?: unknown }[] };
  publicId: string;
};

// The public surface is anonymous by definition, so anything reachable there is
// reachable by everyone. These guard the projection boundary: only elements that
// are both `public` and publicly eligible may cross it.
describe("public projection", () => {
  let organization: OrganizationFixture;
  let published: { productId: string; publicId: string };

  beforeAll(async () => {
    organization = await createOrganization("public");
    const dpp = await createDraftDpp(organization.admin, {
      dataElements: [
        publicElement("material", "aluminium"),
        controlledElement("supplier-price", "42.00", {
          readRoles: ["admin", "authority"],
          writeRoles: ["admin"],
        }),
        {
          ...publicElement("internal-note", "not for the public"),
          publicEligible: false,
        },
      ],
    });
    await publishDpp(organization.admin, dpp.publicId);
    published = { productId: dpp.productId, publicId: dpp.publicId };
  });

  it("serves the public elements of a published DPP anonymously", async () => {
    const response = await anonymous.get<PublicPayload>(`/public/dpps/${published.publicId}`);

    expect(response.status).toBe(200);
    expect(response.body.dpp.dataElements.map((element) => element.elementId)).toContain(
      "material",
    );
  });

  it("never exposes a controlled element", async () => {
    const response = await anonymous.get<PublicPayload>(`/public/dpps/${published.publicId}`);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("supplier-price");
    // The value itself must not survive anywhere in the payload either.
    expect(serialized).not.toContain("42.00");
  });

  it("honours publicEligible: false on an otherwise public element", async () => {
    const response = await anonymous.get<PublicPayload>(`/public/dpps/${published.publicId}`);

    expect(JSON.stringify(response.body)).not.toContain("internal-note");
  });

  it("resolves a published DPP by product id", async () => {
    const response = await anonymous.get<PublicPayload>(
      `/public/dpps?productId=${encodeURIComponent(published.productId)}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.publicId).toBe(published.publicId);
  });

  it("does not serve a draft DPP publicly", async () => {
    const draft = await createDraftDpp(organization.admin, {
      dataElements: [publicElement("material", "steel")],
    });

    const response = await anonymous.get(`/public/dpps/${draft.publicId}`);

    expect(response.status).toBe(404);
  });

  it("keeps serving the published version while a new revision is drafted", async () => {
    const dpp = await createDraftDpp(organization.admin, {
      dataElements: [publicElement("material", "titanium")],
    });
    await publishDpp(organization.admin, dpp.publicId);

    const revision = await organization.admin.post(`/dpps/${dpp.publicId}/revisions`);
    expect(revision.status).toBe(201);

    // The DPP is a draft again, but its published version stays public — that is
    // the whole point of the active-version model.
    const response = await anonymous.get<PublicPayload>(`/public/dpps/${dpp.publicId}`);
    expect(response.status).toBe(200);
    expect(response.body.dpp.dataElements.map((element) => element.elementId)).toContain(
      "material",
    );
  });

  it("stops serving an archived DPP", async () => {
    const dpp = await createDraftDpp(organization.admin, {
      dataElements: [publicElement("material", "carbon")],
    });
    await publishDpp(organization.admin, dpp.publicId);

    const archived = await organization.admin.put(`/dpps/${dpp.publicId}/status`, {
      status: "archived",
    });
    expect(archived.status).toBe(200);

    const response = await anonymous.get(`/public/dpps/${dpp.publicId}`);
    expect(response.status).toBe(404);
  });

  it("refuses an ambiguous product id instead of picking a tenant", async () => {
    // A productId is only unique per organization. Serving an arbitrary match
    // would leak across tenants (G12).
    const sharedProductId = `shared-${randomUUID()}`;
    const other = await createOrganization("public-rival");

    for (const fixture of [organization, other]) {
      const dpp = await createDraftDpp(fixture.admin, {
        productId: sharedProductId,
        dataElements: [publicElement("material", "brass")],
      });
      await publishDpp(fixture.admin, dpp.publicId);
    }

    const response = await anonymous.get<{ messages: { code: string }[] }>(
      `/public/dpps?productId=${encodeURIComponent(sharedProductId)}`,
    );

    expect(response.status).toBe(409);
    expect(response.body.messages[0]?.code).toBe("PUBLIC_DPP_AMBIGUOUS");
  });

  it("resolves the canonical DPP id even when the product id is ambiguous", async () => {
    const response = await anonymous.get(`/public/dpps/${published.publicId}`);

    expect(response.status).toBe(200);
  });
});
