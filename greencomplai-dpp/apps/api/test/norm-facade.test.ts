import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  anonymous,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp, publicElement, publishDpp } from "./helpers/dpp.js";

// ///the facade per EN 18222 section 8.
//
// It's meant to do exactly three things - translate paths, wrap errors into
// the norm's result object, pass successes through unwrapped - and nothing
// else. What it **doesn't** do matters here as much as what it does: it
// brings no authorization of its own, since it delegates through the same
// app. These tests pin down both halves.

const FACADE = "/en18222/v1";

type NormResult = {
  message: { code?: string; correlationId?: string; messageType: string; text: string }[];
};
type Dpp = { collections: unknown[]; dataElements: unknown[]; productId: string };

describe("EN 18222 norm facade", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;
  let viewer: TestClient;
  let dppId: string;
  let productId: string;

  beforeAll(async () => {
    organization = await createOrganization("norm");
    editor = await addMember(organization, "editor");
    viewer = await addMember(organization, "viewer");

    const dpp = await createDraftDpp(organization.admin, {
      dataElements: [publicElement("gewicht", "12 kg")],
      collections: [
        {
          elementId: "material",
          kind: "collection",
          visibility: "public",
          dataElements: [publicElement("anteil", "40 %")],
        },
      ],
    });
    dppId = dpp.publicId;
    productId = dpp.productId;
  });

  describe("lifecycle API (Tabelle 17)", () => {
    it("ReadDPPById serves the passport unwrapped", async () => {
      const response = await organization.admin.get<Dpp>(`${FACADE}/dpps/${dppId}`);

      expect(response.status).toBe(200);
      // No envelope: Table 17 names the result "DPP", not "object containing
      // a DPP".
      expect(response.body.productId).toBe(productId);
      expect((response.body as unknown as { dpp?: unknown }).dpp).toBeUndefined();
    });

    it("ReadDPPByProductId resolves through the product identifier", async () => {
      const response = await organization.admin.get<Dpp>(
        `${FACADE}/dppsByProductId/${encodeURIComponent(productId)}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.productId).toBe(productId);
    });

    it("ReadDPPByProductId 404s an unknown product", async () => {
      const response = await organization.admin.get<NormResult>(
        `${FACADE}/dppsByProductId/gibt-es-nicht`,
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toHaveLength(1);
    });

    it("ReadDPPIdsByProductIds takes the set in the body", async () => {
      const response = await organization.admin.post<{ ids: string[] }>(
        `${FACADE}/dppsByProductIds`,
        { productIds: [productId] },
      );

      expect(response.status).toBe(200);
      expect(response.body.ids.length).toBeGreaterThan(0);
    });

    it("CreateDPP creates through the facade", async () => {
      const fresh = `norm-product-${randomUUID().slice(0, 8)}`;
      const operator = await organization.admin.get<{
        economicOperators: { operatorId: string }[];
      }>("/economic-operators");

      const response = await organization.admin.post<{ dpp: Dpp; publicId: string }>(
        `${FACADE}/dpps`,
        {
          productId: fresh,
          granularity: "model",
          dppSchemaVersion: "test-dictionary/2026.1",
          economicOperatorId: operator.body.economicOperators[0]?.operatorId,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.dpp.productId).toBe(fresh);
    });

    // The real difference from the internal semantics: RFC 7396 deletes on
    // `null`, and the patch sits directly in the body instead of under
    // `snapshot`.
    it("UpdateDPP takes the partial passport directly in the body", async () => {
      const target = (await createDraftDpp(organization.admin, {})).publicId;

      const response = await organization.admin.patch<Dpp>(`${FACADE}/dpps/${target}`, {
        granularity: "item",
      });

      expect(response.status).toBe(200);
      expect((response.body as unknown as { granularity: string }).granularity).toBe("item");
    });
  });

  describe("fine-grained API (Tabelle 19)", () => {
    it("ReadDataElementCollection serves the collection unwrapped", async () => {
      const response = await organization.admin.get<{ elementId: string }>(
        `${FACADE}/dpps/${dppId}/collections/material`,
      );

      expect(response.status).toBe(200);
      expect(response.body.elementId).toBe("material");
    });

    it("ReadElement resolves a path with a separator in it", async () => {
      const response = await organization.admin.get<{ value: unknown }>(
        `${FACADE}/dpps/${dppId}/elements/material/anteil`,
      );

      expect(response.status).toBe(200);
      expect(response.body.value).toBe("40 %");
    });

    it("UpdateElement patches a single element", async () => {
      const target = (
        await createDraftDpp(organization.admin, {
          dataElements: [publicElement("gewicht", "12 kg")],
        })
      ).publicId;

      const response = await organization.admin.patch<{ value: unknown }>(
        `${FACADE}/dpps/${target}/elements/gewicht`,
        { value: "13 kg" },
      );

      expect(response.status).toBe(200);
      expect(response.body.value).toBe("13 kg");
    });

    it("UpdateDataElementCollection patches a collection", async () => {
      const target = (
        await createDraftDpp(organization.admin, {
          collections: [
            {
              elementId: "material",
              kind: "collection",
              visibility: "public",
              dataElements: [publicElement("anteil", "40 %")],
            },
          ],
        })
      ).publicId;

      const response = await organization.admin.patch<{ dataElements: unknown[] }>(
        `${FACADE}/dpps/${target}/collections/material`,
        { dataElements: [publicElement("anteil", "90 %"), publicElement("neu", "x")] },
      );

      expect(response.status).toBe(200);
      expect(response.body.dataElements).toHaveLength(2);
    });
  });

  describe("result object (Tabelle 13–16)", () => {
    it("names the attribute `message`, not `messages`", async () => {
      const response = await organization.admin.get<NormResult>(`${FACADE}/dpps/gibt-es-nicht`);

      expect(response.status).toBe(404);
      // Table 13: the attribute is named `message` and carries 0..* messages.
      expect(Array.isArray(response.body.message)).toBe(true);
      expect((response.body as unknown as { messages?: unknown }).messages).toBeUndefined();
    });

    it("carries the message fields the norm defines", async () => {
      const response = await organization.admin.get<NormResult>(`${FACADE}/dpps/gibt-es-nicht`);

      const message = response.body.message[0];
      expect(message?.messageType).toBe("Error");
      expect(typeof message?.text).toBe("string");
      // Per Table 14, `code` is the technology-dependent code - ours.
      expect(message?.code).toBe("DPP_NOT_FOUND");
    });

    // Table 14 has no `path`. The field reference still must not disappear,
    // so it's folded into the text.
    it("folds the field reference into the text instead of inventing an attribute", async () => {
      const response = await organization.admin.post<NormResult>(`${FACADE}/dpps`, {
        granularity: "model",
      });

      expect(response.status).toBe(422);
      const message = response.body.message[0];
      expect((message as unknown as { path?: string })?.path).toBeUndefined();
      expect(response.body.message.some((entry) => entry.text.includes("productId"))).toBe(true);
    });

    // Table 16 marks every Success* code as "has result object: No".
    it("puts no result object on a success", async () => {
      const response = await organization.admin.get<Record<string, unknown>>(
        `${FACADE}/dpps/${dppId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBeUndefined();
    });
  });

  // The core of the decision to build the facade as a delegation layer: it
  // cannot forget to enforce guards, because it doesn't contain any.
  describe("the same guards as the internal API", () => {
    it("refuses an anonymous caller", async () => {
      expect((await anonymous.get(`${FACADE}/dpps/${dppId}`)).status).toBe(401);
    });

    it("refuses a member of another organization", async () => {
      const rival = await createOrganization("norm-rival");

      expect((await rival.admin.get(`${FACADE}/dpps/${dppId}`)).status).toBe(404);
    });

    it("keeps the role gate on writes", async () => {
      const response = await viewer.patch(`${FACADE}/dpps/${dppId}`, { granularity: "item" });

      expect(response.status).toBe(403);
    });

    it("keeps the draft-only rule", async () => {
      const target = (await createDraftDpp(organization.admin, {})).publicId;
      await publishDpp(organization.admin, target);

      const response = await organization.admin.patch<NormResult>(`${FACADE}/dpps/${target}`, {
        granularity: "item",
      });

      expect(response.status).toBe(409);
      expect(response.body.message[0]?.code).toBe("DPP_NOT_EDITABLE");
    });

    it("keeps element policies on the fine-grained routes", async () => {
      const target = (
        await createDraftDpp(organization.admin, {
          dataElements: [
            {
              elementId: "nur-admin",
              kind: "single",
              value: "geheim",
              valueDataType: "string",
              visibility: "controlled",
              policy: { readRoles: ["admin"], writeRoles: ["admin"] },
            },
          ],
        })
      ).publicId;

      const response = await editor.patch(`${FACADE}/dpps/${target}/elements/nur-admin`, {
        value: "verändert",
      });

      expect(response.status).toBe(403);
    });

    it("records the read in the audit trail, like the internal route", async () => {
      const target = (await createDraftDpp(organization.admin, {})).publicId;
      await organization.admin.get(`${FACADE}/dpps/${target}`);

      const audit = await organization.admin.get<{ audit: { eventType: string }[] }>(
        `/dpps/${target}/audit-events`,
      );

      expect(audit.body.audit.map((entry) => entry.eventType)).toContain("dpp.read");
    });
  });
});
