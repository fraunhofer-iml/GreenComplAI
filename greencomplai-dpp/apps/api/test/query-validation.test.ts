import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { anonymous, createOrganization, type OrganizationFixture } from "./helpers/client.js";
import { createDraftDpp } from "./helpers/dpp.js";

type Messages = { messages: { code?: string; path?: string; text: string }[] };

// Query parameters used to depend on hand-written parsers up to `clampNumber` silently
// corrected an oversized page, an unknown status was silently dropped. Both answer a different
// question than the one asked. The query now has the same enforcement as the body - one schema,
// 422, one message per violated field.
describe("query parameter validation", () => {
  let organization: OrganizationFixture;
  let firstProductId: string;
  let secondProductId: string;

  beforeAll(async () => {
    organization = await createOrganization("query");
    firstProductId = `first-${randomUUID().slice(0, 8)}`;
    secondProductId = `second-${randomUUID().slice(0, 8)}`;
    await createDraftDpp(organization.admin, { productId: firstProductId });
    await createDraftDpp(organization.admin, { productId: secondProductId });
    await createDraftDpp(organization.admin);
  });

  describe("rejects instead of quietly correcting", () => {
    it("refuses a page size above the maximum", async () => {
      const response = await organization.admin.get<Messages>("/dpps?limit=101");

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("limit");
    });

    it("refuses a non-numeric page size", async () => {
      const response = await organization.admin.get<Messages>("/dpps?limit=alle");

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("limit");
    });

    it("refuses a negative offset", async () => {
      const response = await organization.admin.get<Messages>("/dpps?offset=-1");

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("offset");
    });

    // Previously: unknown status meant no filter. The caller got all DPPs and took them for
    // their filter's results.
    it("refuses an unknown status instead of ignoring the filter", async () => {
      const response = await organization.admin.get<Messages>("/dpps?status=freigegeben");

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("status");
    });

    it("refuses more product ids than one request may carry", async () => {
      const query = Array.from({ length: 201 }, (_, index) => `productId=p${index}`).join("&");

      const response = await organization.admin.get<Messages>(`/dpps?${query}`);

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("productId");
    });
  });

  describe("accepts what is unambiguous", () => {
    it("applies the default page size when none is given", async () => {
      const response = await organization.admin.get<{ result: { dpps: unknown[] } }>("/dpps");

      expect(response.status).toBe(200);
      expect(response.body.result.dpps.length).toBeLessThanOrEqual(25);
    });

    it("treats an empty filter as no filter rather than as an error", async () => {
      // An empty input form sends `?search=`. That unambiguously means "no filter" - there's no
      // reason to reject the caller for it.
      const response = await organization.admin.get<{ result: { dpps: unknown[] } }>(
        "/dpps?search=&status=",
      );

      expect(response.status).toBe(200);
      expect(response.body.result.dpps.length).toBeGreaterThan(0);
    });

    it("reads a single product id and a repeated one the same way", async () => {
      const single = await organization.admin.get<{ result: { dpps: { productId: string }[] } }>(
        `/dpps?productId=${encodeURIComponent(firstProductId)}`,
      );
      const repeated = await organization.admin.get<{ result: { dpps: { productId: string }[] } }>(
        `/dpps?productId=${encodeURIComponent(firstProductId)}&productId=${encodeURIComponent(secondProductId)}`,
      );

      expect(single.body.result.dpps.map((dpp) => dpp.productId)).toEqual([firstProductId]);
      expect(repeated.body.result.dpps.map((dpp) => dpp.productId).sort()).toEqual(
        [firstProductId, secondProductId].sort(),
      );
    });
  });

  describe("the public surface", () => {
    it("refuses a resolution without a product id", async () => {
      const response = await anonymous.get<Messages>("/public/dpps");

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("productId");
    });
  });
});
