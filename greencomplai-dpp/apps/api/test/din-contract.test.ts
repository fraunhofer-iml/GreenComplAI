import { beforeAll, describe, expect, it } from "vitest";

import { anonymous, createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { createDraftDpp, type CreatedDpp } from "./helpers/dpp.js";

type IdsResult = { result: { ids: string[]; nextCursor: string | null } };

// prEN 18222 4.5 ReadDPPIdsByProductIds (Table 17) plus the structured
// error/result envelope the norm expects on every response.
describe("DIN 18222 facade", () => {
  let organization: OrganizationFixture;
  let first: CreatedDpp;
  let second: CreatedDpp;

  beforeAll(async () => {
    organization = await createOrganization("din");
    first = await createDraftDpp(organization.admin);
    second = await createDraftDpp(organization.admin);
  });

  describe("ReadDPPIdsByProductIds", () => {
    it("resolves a set of product ids to DPP identifiers", async () => {
      const response = await organization.admin.post<IdsResult>("/dpps/ids-by-products", {
        productIds: [first.productId, second.productId],
      });

      expect(response.status).toBe(200);
      expect(response.body.result.ids).toContain(first.digitalProductPassportId);
      expect(response.body.result.ids).toContain(second.digitalProductPassportId);
    });

    // The norm identifies passports by their URN, not by our routing handle.
    it("returns canonical URNs, not public ids", async () => {
      const response = await organization.admin.post<IdsResult>("/dpps/ids-by-products", {
        productIds: [first.productId],
      });

      expect(response.body.result.ids[0]).toMatch(/^urn:dpp:/);
      expect(response.body.result.ids).not.toContain(first.publicId);
    });

    it("returns an empty set for unknown product ids rather than failing", async () => {
      const response = await organization.admin.post<IdsResult>("/dpps/ids-by-products", {
        productIds: ["does-not-exist"],
      });

      expect(response.status).toBe(200);
      expect(response.body.result.ids).toEqual([]);
    });

    it("never crosses the tenant boundary", async () => {
      const other = await createOrganization("din-rival");

      const response = await other.admin.post<IdsResult>("/dpps/ids-by-products", {
        productIds: [first.productId],
      });

      expect(response.body.result.ids).toEqual([]);
    });

    it("paginates with an opaque cursor", async () => {
      const page = await organization.admin.post<IdsResult>("/dpps/ids-by-products", {
        productIds: [first.productId, second.productId],
        limit: 1,
      });

      expect(page.body.result.ids).toHaveLength(1);
      expect(page.body.result.nextCursor).toBeTruthy();

      const next = await organization.admin.post<IdsResult>("/dpps/ids-by-products", {
        productIds: [first.productId, second.productId],
        limit: 1,
        cursor: page.body.result.nextCursor,
      });

      expect(next.body.result.ids).toHaveLength(1);
      expect(next.body.result.ids[0]).not.toBe(page.body.result.ids[0]);
    });

    it("caps the batch size instead of accepting an unbounded request", async () => {
      const response = await organization.admin.post("/dpps/ids-by-products", {
        productIds: Array.from({ length: 201 }, (_, index) => `product-${index}`),
      });

      expect(response.status).toBe(422);
    });

    it("rejects an empty product-id set", async () => {
      const response = await organization.admin.post("/dpps/ids-by-products", { productIds: [] });

      expect(response.status).toBe(422);
    });

    // The GET convenience variant is gone: it was a filter wearing a path, and
    // nothing outside its own test ever called it. The list's productId filter
    // does the same job.
    it("resolves a product's DPPs through the list filter", async () => {
      const response = await organization.admin.get<{
        result: { dpps: { digitalProductPassportId: string; productId: string }[] };
      }>(`/dpps?productId=${encodeURIComponent(first.productId)}`);

      expect(response.status).toBe(200);
      expect(response.body.result.dpps.map((dpp) => dpp.digitalProductPassportId)).toEqual([
        first.digitalProductPassportId,
      ]);
    });
  });

  describe("result envelope", () => {
    it("reports an error as a typed message, not a bare string", async () => {
      const response = await anonymous.get<{
        messages: { code?: string; messageType: string; text: string; timestamp: string }[];
      }>("/public/dpps/does-not-exist");

      expect(response.status).toBe(404);
      const [message] = response.body.messages;
      expect(message?.messageType).toBe("Error");
      expect(message?.code).toBe("PUBLIC_DPP_NOT_FOUND");
      expect(message?.text).toBeTruthy();
      expect(message?.timestamp).toBeTruthy();
    });

    // Every layer answers in the same envelope: before G38 the middleware used
    // `{ error: { code } }` while the services used Result messages, so a client
    // had to know which layer rejected it in order to read why.
    it("carries a machine-readable code on an authorization failure", async () => {
      const other = await createOrganization("din-outsider");
      const impersonating = other.admin.forOrganization(organization.id);

      const response = await impersonating.get<{ messages: { code?: string }[] }>("/dpps");

      expect(response.status).toBe(403);
      expect(response.body.messages[0]?.code).toBe("FORBIDDEN");
    });

    it("reports a validation failure per offending field", async () => {
      const response = await organization.admin.post<{
        messages: { code?: string; path?: string }[];
      }>("/dpps", { granularity: "model" });

      expect(response.status).toBe(422);
      // Field paths let a form put each message next to its input instead of
      // showing one page-level error (G38).
      const paths = response.body.messages.map((message) => message.path);
      expect(paths).toContain("productId");
      expect(response.body.messages[0]?.code).toBe("VALIDATION_FAILED");
    });
  });
});
