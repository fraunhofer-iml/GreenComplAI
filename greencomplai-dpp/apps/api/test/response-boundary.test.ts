import { randomUUID } from "node:crypto";

import { blobObjects, organizationInvitations } from "@dpp/db/schema";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../src/db.js";
import { anonymous, createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { createDraftDpp, publishDpp } from "./helpers/dpp.js";

// Guards the outbound boundary against the fields that are credentials or
// internal addresses. Each of these lives in a column the repositories are
// careful not to select — but "careful" is a habit, and a response schema is
// what turns it into a rule. These tests fail the moment the habit slips.
describe("response boundary", () => {
  let organization: OrganizationFixture;

  beforeAll(async () => {
    organization = await createOrganization("boundary");
  });

  describe("invitations", () => {
    it("never lists the redemption token", async () => {
      const email = `invitee-${randomUUID()}@example.test`;
      const created = await organization.admin.post<{ result: { token: string } }>("/invitations", {
        email,
        role: "editor",
      });
      expect(created.status).toBe(201);

      const list = await organization.admin.get("/invitations");

      // The token is what redeems an invitation. Listing them must not hand an
      // admin screen — or anything that logs its payloads — a set of working
      // links.
      expect(JSON.stringify(list.body)).not.toContain(created.body.result.token);
    });

    it("returns the token only to whoever just created the invitation", async () => {
      const created = await organization.admin.post<{ result: { token: string } }>("/invitations", {
        email: `invitee-${randomUUID()}@example.test`,
        role: "viewer",
      });

      // Deliberate: without SMTP configured, this link is the only way the
      // invitation reaches the invitee.
      expect(created.body.result.token).toBeTruthy();
    });

    it("does not leak the token through the invitation list of a fresh admin", async () => {
      const [row] = await db
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.organizationId, organization.id))
        .limit(1);
      expect(row).toBeDefined();

      const list = await organization.admin.get("/invitations");

      expect(JSON.stringify(list.body)).not.toContain(row!.token);
    });
  });

  describe("documents", () => {
    it("never exposes the storage key", async () => {
      const form = new FormData();
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
      form.append(
        "file",
        new File([pdf as BufferSource], "sheet.pdf", { type: "application/pdf" }),
      );

      const uploaded = await organization.admin.sendRaw<{ result: { id: string } }>(
        "POST",
        "/documents",
        form,
      );
      expect(uploaded.status).toBe(201);

      const [row] = await db
        .select()
        .from(blobObjects)
        .where(eq(blobObjects.id, uploaded.body.result.id));
      expect(row?.storageKey).toBeTruthy();

      const metadata = await organization.admin.get(`/documents/${uploaded.body.result.id}`);

      // The storage key addresses the object in the bucket. No client needs it —
      // downloads go through the API, which checks access and then signs a
      // short-lived URL.
      expect(JSON.stringify(uploaded.body)).not.toContain(row!.storageKey);
      expect(JSON.stringify(metadata.body)).not.toContain(row!.storageKey);
      expect(JSON.stringify(metadata.body)).not.toContain("storageKey");
    });
  });

  describe("public surface", () => {
    it("cannot carry internal display metadata into an anonymous response", async () => {
      const repositoryKey = `boundary-${randomUUID().slice(0, 8)}`;
      await organization.admin.post("/data-dictionary-repositories", {
        repositoryKey,
        name: { de: "Grenzwörterbuch" },
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
        metadata: {
          // Internal UI hints: grouping and ordering for our own editor. They
          // have no business on the anonymous surface, and the schema gives them
          // no field to travel in — stripInternalDictionaryMetadata is a habit,
          // this is a rule.
          internalDisplay: { presentation: "metric", groupId: "leak-me" },
        },
      });

      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          {
            elementId: "weight",
            dictionaryReference: "weight",
            kind: "single",
            value: "12",
            valueDataType: "string",
            visibility: "public",
          },
        ],
      });
      await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dppSchemaVersion: `${repositoryKey}/2026.1` },
      });
      await publishDpp(organization.admin, dpp.publicId);

      const response = await anonymous.get(`/public/dpps/${dpp.publicId}`);

      expect(response.status).toBe(200);
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain("internalDisplay");
      expect(serialized).not.toContain("leak-me");
    });
  });

  // The relationship response schema was written against the DB row, and no test
  // read this route — so nothing had ever proven the schema matches, nor that
  // the internal join columns stay behind. listDppRelationships uses a bare
  // select(), so the row carries them.
  describe("relationships", () => {
    it("serves relationships without the internal join columns", async () => {
      const source = await createDraftDpp(organization.admin);
      const target = await createDraftDpp(organization.admin);

      const created = await organization.admin.post(`/dpps/${source.publicId}/relationships`, {
        targetDigitalProductPassportId: target.digitalProductPassportId,
        relationshipType: "contains",
        visibility: "public",
      });
      expect(created.status).toBe(201);

      const list = await organization.admin.get<{
        relationships: Record<string, unknown>[];
      }>(`/dpps/${source.publicId}/relationships`);

      expect(list.status).toBe(200);
      expect(list.body.relationships).toHaveLength(1);

      // Internal plumbing: the row's own organizationId and the surrogate keys of
      // both ends. A caller addresses DPPs by their identifiers, never by these.
      const serialized = JSON.stringify(list.body);
      expect(serialized).not.toContain("organizationId");
      expect(serialized).not.toContain("sourceDppId");
      expect(serialized).not.toContain("targetDppId");
    });
  });

  // `identifiers` used to mean two different things: GET /products returned the
  // jsonb column (a type->value map), GET /products/:id overwrote it with the
  // joined rows. Same field, two shapes, un-typeable. The jsonb column is gone;
  // the normalized table is the only source.
  describe("product identifiers", () => {
    const productPayload = (productId: string) => ({
      productId,
      name: { de: "Testprodukt" },
      lifecycleStatus: "active",
      identifiers: { gtin: "04012345678901" },
    });

    it("returns the same shape from create, list and detail", async () => {
      const productId = `product-${randomUUID().slice(0, 8)}`;
      const created = await organization.admin.post<{
        product: { identifiers: unknown };
      }>("/products", productPayload(productId));
      expect(created.status).toBe(201);

      const detail = await organization.admin.get<{ product: { identifiers: unknown } }>(
        `/products/${productId}`,
      );
      const list = await organization.admin.get<{
        products: { identifiers: unknown; productId: string }[];
      }>("/products");
      const listed = list.body.products.find((product) => product.productId === productId);

      const expected = [
        { identifierType: "gtin", identifierValue: "04012345678901", issuer: null },
      ];
      expect(created.body.product.identifiers).toEqual(expected);
      expect(detail.body.product.identifiers).toEqual(expected);
      expect(listed?.identifiers).toEqual(expected);
    });

    // The list form is the real one: it has the same shape as the response
    // and can express what the map cannot.
    it("accepts identifiers as a list, the shape it also returns", async () => {
      const productId = `product-${randomUUID().slice(0, 8)}`;

      const created = await organization.admin.post<{
        product: { identifiers: unknown };
      }>("/products", {
        productId,
        name: { de: "Listenform" },
        lifecycleStatus: "active",
        identifiers: [{ identifierType: "gtin", identifierValue: "04012345678901", issuer: "GS1" }],
      });

      expect(created.status).toBe(201);
      expect(created.body.product.identifiers).toEqual([
        { identifierType: "gtin", identifierValue: "04012345678901", issuer: "GS1" },
      ]);
    });

    // The map cannot express either: it has exactly one value per type and no
    // field for the issuer. The unique index runs over type **and** value, so
    // two batch numbers are permitted.
    it("carries what the map form cannot: an issuer and two values of one type", async () => {
      const productId = `product-${randomUUID().slice(0, 8)}`;

      const created = await organization.admin.post<{
        product: { identifiers: { identifierType: string; issuer: string | null }[] };
      }>("/products", {
        productId,
        name: { de: "Zwei Chargen" },
        lifecycleStatus: "active",
        identifiers: [
          { identifierType: "batch", identifierValue: "CHARGE-1" },
          { identifierType: "batch", identifierValue: "CHARGE-2" },
          { identifierType: "gtin", identifierValue: "04012345678901", issuer: "GS1" },
        ],
      });

      expect(created.status).toBe(201);
      expect(created.body.product.identifiers).toHaveLength(3);
      expect(
        created.body.product.identifiers.filter(
          (identifier) => identifier.identifierType === "batch",
        ),
      ).toHaveLength(2);
      expect(
        created.body.product.identifiers.find((identifier) => identifier.identifierType === "gtin")
          ?.issuer,
      ).toBe("GS1");
    });

    // The same identifier named twice is a harmless duplicate, not a reason
    // for a server error - previously this was a unique violation, and
    // therefore a 500.
    it("collapses a duplicate instead of failing on the unique index", async () => {
      const productId = `product-${randomUUID().slice(0, 8)}`;

      const created = await organization.admin.post<{
        product: { identifiers: unknown[] };
      }>("/products", {
        productId,
        name: { de: "Doppelt genannt" },
        lifecycleStatus: "active",
        identifiers: [
          { identifierType: "sku", identifierValue: "SKU-1" },
          { identifierType: "sku", identifierValue: "SKU-1" },
        ],
      });

      expect(created.status).toBe(201);
      expect(created.body.product.identifiers).toHaveLength(1);
    });

    it("clears the set when an empty list is sent", async () => {
      const productId = `product-${randomUUID().slice(0, 8)}`;
      await organization.admin.post("/products", productPayload(productId));

      const patched = await organization.admin.patch<{
        product: { identifiers: unknown[] };
      }>(`/products/${productId}`, { identifiers: [] });

      expect(patched.status).toBe(200);
      expect(patched.body.product.identifiers).toEqual([]);
    });

    it("replaces the whole set on patch", async () => {
      const productId = `product-${randomUUID().slice(0, 8)}`;
      await organization.admin.post("/products", productPayload(productId));

      const patched = await organization.admin.patch<{
        product: { identifiers: { identifierType: string }[] };
      }>(`/products/${productId}`, { identifiers: { serialNumber: "SN-1" } });

      // The input is the complete set, so the previous gtin is gone rather than
      // merged — a caller sending a partial map would otherwise have no way to
      // remove an identifier.
      expect(patched.body.product.identifiers.map((i) => i.identifierType)).toEqual([
        "serialNumber",
      ]);
    });

    it("never exposes the join table's internal columns", async () => {
      const productId = `product-${randomUUID().slice(0, 8)}`;
      await organization.admin.post("/products", productPayload(productId));

      const detail = await organization.admin.get(`/products/${productId}`);

      const serialized = JSON.stringify(detail.body);
      expect(serialized).not.toContain('createdAt":null');
      expect(
        JSON.stringify(
          (detail.body as { product: { identifiers: unknown[] } }).product.identifiers,
        ),
      ).not.toContain("productId");
    });
  });

  describe("members", () => {
    it("exposes only the membership fields the schema names", async () => {
      const response = await organization.admin.get<{ result: Record<string, unknown>[] }>(
        "/members",
      );

      expect(response.status).toBe(200);
      const [member] = response.body.result;
      expect(Object.keys(member ?? {}).sort()).toEqual([
        "createdAt",
        "email",
        "name",
        "role",
        "status",
        "updatedAt",
        "userId",
      ]);
    });
  });
});
