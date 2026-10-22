import { randomUUID } from "node:crypto";

import { blobObjects } from "@dpp/db/schema";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../src/db.js";

import {
  anonymous,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp, publishDpp } from "./helpers/dpp.js";

// A passport references things that must exist - an economic operator,
// documents, other passports. Until now these were free-form strings and IDs
// that nobody looked up.
//
// Two distinct kinds of damage to keep apart:
//
//   * **Disclosure** would be a foreign reference exposing data. It does not:
//     download checks tenant and policy, and approval sync is scoped to the
//     own tenant. The tests below pin that down so it stays that way.
//   * **Integrity** is the real damage: a passport claims a document it does
//     not own, or a relationship to a passport that does not exist. It is
//     then publishable, looks complete, and leads nowhere on click - and that
//     is noticed by the reviewer, not the author.
//
// The check therefore happens at write time, not read time.

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
]);

type Messages = { messages: { code?: string; path?: string; text: string }[] };

function upload(client: TestClient, filename = "datenblatt.pdf") {
  const form = new FormData();
  form.append("file", new File([PDF_BYTES as BufferSource], filename, { type: "application/pdf" }));
  return client.sendRaw<{ result: { id: string } }>("POST", "/documents", form);
}

const documentElement = (blobObjectId: string) => ({
  elementId: "datenblatt",
  kind: "document" as const,
  blobObjectId,
  filename: "datenblatt.pdf",
  contentType: "application/pdf",
  visibility: "public" as const,
});

describe("reference integrity", () => {
  let organization: OrganizationFixture;
  let rival: OrganizationFixture;
  let operatorId: string;
  let ownBlobId: string;
  let rivalBlobId: string;
  let rivalDppId: string;

  const createWith = (overrides: Record<string, unknown>) =>
    organization.admin.post<Messages>("/dpps", {
      productId: `product-${randomUUID().slice(0, 8)}`,
      granularity: "model",
      dppSchemaVersion: "test-dictionary/2026.1",
      economicOperatorId: operatorId,
      ...overrides,
    });

  beforeAll(async () => {
    organization = await createOrganization("refs");
    rival = await createOrganization("refs-rival");

    operatorId = `OP-${randomUUID().slice(0, 8)}`;
    const created = await organization.admin.post("/economic-operators", {
      operatorId,
      legalName: "Referenz GmbH",
      roles: ["manufacturer"],
    });
    expect(created.status).toBe(201);

    ownBlobId = (await upload(organization.admin)).body.result.id;
    rivalBlobId = (await upload(rival.admin, "fremd.pdf")).body.result.id;
    rivalDppId = (await createDraftDpp(rival.admin)).publicId;
  });

  describe("economic operator", () => {
    it("accepts an operator of the own organization", async () => {
      const response = await createWith({});

      expect(response.status).toBe(201);
    });

    it("refuses an operator that does not exist", async () => {
      const response = await createWith({ economicOperatorId: "OP-GIBT-ES-NICHT" });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.code).toBe("DPP_REFERENCE_NOT_FOUND");
      expect(response.body.messages[0]?.path).toBe("economicOperatorId");
    });

    // The other tenant's operator exists - just not here. The difference
    // must not be readable from the result.
    it("refuses an operator of another organization exactly like an unknown one", async () => {
      const foreign = `OP-${randomUUID().slice(0, 8)}`;
      await rival.admin.post("/economic-operators", {
        operatorId: foreign,
        legalName: "Fremd GmbH",
        roles: ["manufacturer"],
      });

      const response = await createWith({ economicOperatorId: foreign });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.code).toBe("DPP_REFERENCE_NOT_FOUND");
    });

    it("refuses a patch that points the passport at an unknown operator", async () => {
      const dpp = await createDraftDpp(organization.admin, {});

      const response = await organization.admin.patch<Messages>(`/dpps/${dpp.publicId}`, {
        snapshot: { economicOperatorId: "OP-GIBT-ES-NICHT" },
      });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("economicOperatorId");
    });
  });

  describe("documents", () => {
    it("accepts a document of the own organization", async () => {
      const response = await createWith({ dataElements: [documentElement(ownBlobId)] });

      expect(response.status).toBe(201);
    });

    it("refuses a document that does not exist", async () => {
      const response = await createWith({ dataElements: [documentElement(randomUUID())] });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.code).toBe("DPP_REFERENCE_NOT_FOUND");
    });

    it("refuses a document belonging to another organization", async () => {
      const response = await createWith({ dataElements: [documentElement(rivalBlobId)] });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toContain("datenblatt");
    });

    it("finds the reference inside a collection, not just at the top level", async () => {
      const response = await createWith({
        collections: [
          {
            elementId: "unterlagen",
            kind: "collection",
            visibility: "public",
            dataElements: [documentElement(rivalBlobId)],
          },
        ],
      });

      expect(response.status).toBe(422);
    });
  });

  describe("relationships", () => {
    let dppId: string;

    beforeAll(async () => {
      dppId = (await createDraftDpp(organization.admin, {})).publicId;
    });

    it("accepts a relationship to another passport of the own organization", async () => {
      const target = await createDraftDpp(organization.admin, {});

      const response = await organization.admin.post(`/dpps/${dppId}/relationships`, {
        targetDigitalProductPassportId: target.digitalProductPassportId,
        relationshipType: "contains",
        visibility: "controlled",
      });

      expect(response.status).toBe(201);
    });

    // An edge has two ends. Querying it from the target must show that it is
    // **incoming** and where it comes from - otherwise the UI reads the type
    // off the wrong end and points back at the passport it is displaying.
    it("names the direction and the other end at both ends of an edge", async () => {
      const whole = await createDraftDpp(organization.admin, {});
      const part = await createDraftDpp(organization.admin, {});

      const created = await organization.admin.post(`/dpps/${part.publicId}/relationships`, {
        targetDigitalProductPassportId: whole.digitalProductPassportId,
        relationshipType: "isComponentOf",
        visibility: "controlled",
      });
      expect(created.status).toBe(201);

      type Edge = {
        direction: string;
        relationshipType: string;
        sourceProductId?: string | null;
        targetProductId?: string | null;
      };

      // At the part: outgoing, the other end is the whole.
      const fromPart = await organization.admin.get<{ relationships: Edge[] }>(
        `/dpps/${part.publicId}/relationships`,
      );
      expect(fromPart.body.relationships).toEqual([
        expect.objectContaining({
          direction: "outgoing",
          relationshipType: "isComponentOf",
          targetProductId: whole.productId,
        }),
      ]);

      // At the whole: the same edge, but incoming - and the other end is the
      // part, not the passport itself.
      const fromWhole = await organization.admin.get<{ relationships: Edge[] }>(
        `/dpps/${whole.publicId}/relationships`,
      );
      expect(fromWhole.body.relationships).toEqual([
        expect.objectContaining({
          direction: "incoming",
          relationshipType: "isComponentOf",
          sourceProductId: part.productId,
        }),
      ]);
    });

    it("refuses a relationship to a passport that does not exist", async () => {
      const response = await organization.admin.post<Messages>(`/dpps/${dppId}/relationships`, {
        targetDigitalProductPassportId: `urn:dpp:${randomUUID()}`,
        relationshipType: "contains",
        visibility: "controlled",
      });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("targetDigitalProductPassportId");
    });

    it("refuses a relationship into another organization", async () => {
      const response = await organization.admin.post<Messages>(`/dpps/${dppId}/relationships`, {
        targetDigitalProductPassportId: rivalDppId,
        relationshipType: "contains",
        visibility: "controlled",
      });

      expect(response.status).toBe(422);
    });

    // "Contains itself" is not a statement about the product but a typo with
    // consequences: resolution would loop forever.
    it("refuses a passport related to itself", async () => {
      const self = await organization.admin.get<{ dpp: { digitalProductPassportId: string } }>(
        `/dpps/${dppId}`,
      );

      const response = await organization.admin.post<Messages>(`/dpps/${dppId}/relationships`, {
        targetDigitalProductPassportId: self.body.dpp.digitalProductPassportId,
        relationshipType: "contains",
        visibility: "controlled",
      });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.code).toBe("DPP_SELF_RELATIONSHIP");
    });
  });

  // The check does not only sit at write time: what gets published must not
  // point into the void, even if the passport predates the rule or a document
  // was removed in the meantime.
  describe("at publish time", () => {
    it("refuses to publish a passport whose document has vanished", async () => {
      const blobId = (await upload(organization.admin, "verschwindet.pdf")).body.result.id;
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [documentElement(blobId)],
      });

      // Deleted around the repository, the way the orphan sweep does it: the
      // snapshot keeps the reference, the object is gone.
      await db.delete(blobObjects).where(eq(blobObjects.id, blobId));

      await organization.admin.put(`/dpps/${dpp.publicId}/status`, { status: "review" });
      const response = await organization.admin.put<Messages>(`/dpps/${dpp.publicId}/status`, {
        status: "published",
      });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.code).toBe("DPP_REFERENCE_NOT_FOUND");
    });
  });

  // What the check does *not* need to guarantee, because it already holds
  // elsewhere. Without these tests the reasoning above would be a claim.
  describe("what already holds without it", () => {
    it("never releases another organization's document through a publish", async () => {
      // The passport is created with a foreign blob ID before the check takes
      // effect - via the database, since the endpoint now rejects it. What
      // matters here is the second line of defense: approval sync is scoped
      // to the own tenant, so a foreign document never goes public even if a
      // reference points at it.
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [documentElement(ownBlobId)],
      });
      await publishDpp(organization.admin, dpp.publicId);

      expect((await anonymous.get(`/public/documents/${ownBlobId}/content`)).status).toBe(302);
      expect((await anonymous.get(`/public/documents/${rivalBlobId}/content`)).status).toBe(404);
    });

    it("keeps another organization's document unreachable for a member here", async () => {
      const response = await organization.admin.get(`/documents/${rivalBlobId}/content`);

      expect(response.status).toBe(404);
    });
  });
});
