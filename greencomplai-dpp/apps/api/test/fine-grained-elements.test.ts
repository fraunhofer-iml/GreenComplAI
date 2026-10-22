import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { controlledElement, createDraftDpp, publicElement, publishDpp } from "./helpers/dpp.js";

// /EN 18222 Table 19 addresses individual elements of a passport
// instead of the whole passport. The gain is not convenience but accuracy:
// whoever changes a field sends a field - and does not incidentally overwrite
// everything else with whatever stale state they happened to have loaded.
//
// Writes follow RFC 7396 (merge patch), and the one property to know is
// `null`: it **deletes**. That is the difference from the internal patch
// semantics, where `null` is a value like any other.

type Element = { elementId: string; policy?: unknown; value?: unknown; visibility?: string };
type Collection = { dataElements: Element[]; elementId: string };
type Messages = { messages: { code?: string; text: string }[] };

const collection = (elementId: string, children: unknown[]) => ({
  elementId,
  kind: "collection" as const,
  visibility: "public" as const,
  dataElements: children,
});

describe("fine-grained element API", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;
  let viewer: TestClient;
  let dppId: string;

  beforeAll(async () => {
    organization = await createOrganization("fine");
    editor = await addMember(organization, "editor");
    viewer = await addMember(organization, "viewer");
  });

  const freshDpp = async () =>
    (
      await createDraftDpp(organization.admin, {
        dataElements: [
          publicElement("gewicht", "12 kg"),
          controlledElement("einkaufspreis", "42 EUR", {
            readRoles: ["admin"],
            writeRoles: ["admin"],
          }),
        ],
        collections: [
          collection("material", [
            publicElement("anteil", "40 %"),
            publicElement("herkunft", "EU"),
          ]),
        ],
      })
    ).publicId;

  beforeAll(async () => {
    dppId = await freshDpp();
  });

  describe("reading", () => {
    it("reads a top-level element by its path", async () => {
      const response = await organization.admin.get<{ element: Element }>(
        `/dpps/${dppId}/elements/gewicht`,
      );

      expect(response.status).toBe(200);
      expect(response.body.element.value).toBe("12 kg");
    });

    it("reads an element inside a collection", async () => {
      const response = await organization.admin.get<{ element: Element }>(
        `/dpps/${dppId}/elements/material/anteil`,
      );

      expect(response.status).toBe(200);
      expect(response.body.element.value).toBe("40 %");
    });

    it("reads a whole collection", async () => {
      const response = await organization.admin.get<{ collection: Collection }>(
        `/dpps/${dppId}/collections/material`,
      );

      expect(response.status).toBe(200);
      expect(response.body.collection.dataElements).toHaveLength(2);
    });

    it("404s an unknown path", async () => {
      expect((await organization.admin.get(`/dpps/${dppId}/elements/gibtsnicht`)).status).toBe(404);
      expect((await organization.admin.get(`/dpps/${dppId}/collections/gibtsnicht`)).status).toBe(
        404,
      );
    });

    // Not 403: a 403 would confirm the element exists. For a role that may
    // not read it, it does not exist.
    it("hides a controlled element from a role whose policy excludes it", async () => {
      const response = await viewer.get(`/dpps/${dppId}/elements/einkaufspreis`);

      expect(response.status).toBe(404);
    });

    it("still serves it to the admin", async () => {
      const response = await organization.admin.get<{ element: Element }>(
        `/dpps/${dppId}/elements/einkaufspreis`,
      );

      expect(response.status).toBe(200);
    });
  });

  describe("patching an element", () => {
    it("changes one field and leaves its neighbours alone", async () => {
      const target = await freshDpp();

      const patched = await organization.admin.patch<{ element: Element }>(
        `/dpps/${target}/elements/gewicht`,
        { value: "13 kg" },
      );

      expect(patched.status).toBe(200);
      expect(patched.body.element.value).toBe("13 kg");

      const neighbour = await organization.admin.get<{ element: Element }>(
        `/dpps/${target}/elements/material/anteil`,
      );
      expect(neighbour.body.element.value).toBe("40 %");
    });

    it("patches an element inside a collection", async () => {
      const target = await freshDpp();

      const patched = await organization.admin.patch<{ element: Element }>(
        `/dpps/${target}/elements/material/anteil`,
        { value: "60 %" },
      );

      expect(patched.status).toBe(200);
      expect(patched.body.element.value).toBe("60 %");
    });

    // RFC 7396: `null` deletes the field instead of setting it to null.
    it("removes a field when the patch sets it to null", async () => {
      const target = await freshDpp();
      await organization.admin.patch(`/dpps/${target}/elements/gewicht`, {
        name: { de: "Gewicht" },
      });

      const patched = await organization.admin.patch<{ element: Element & { name?: unknown } }>(
        `/dpps/${target}/elements/gewicht`,
        { name: null },
      );

      expect(patched.status).toBe(200);
      expect(patched.body.element.name).toBeUndefined();
    });

    // The `elementId` is the address. Changing it via the patch body would
    // mean hitting a different element than the one addressed.
    it("ignores an attempt to rename the element through its own patch", async () => {
      const target = await freshDpp();

      const patched = await organization.admin.patch<{ element: Element }>(
        `/dpps/${target}/elements/gewicht`,
        { elementId: "etwas-anderes", value: "14 kg" },
      );

      expect(patched.status).toBe(200);
      expect(patched.body.element.elementId).toBe("gewicht");
      expect((await organization.admin.get(`/dpps/${target}/elements/etwas-anderes`)).status).toBe(
        404,
      );
    });

    it("404s a path that does not exist rather than creating it", async () => {
      const target = await freshDpp();

      const response = await organization.admin.patch(`/dpps/${target}/elements/neu`, {
        value: "x",
      });

      expect(response.status).toBe(404);
    });
  });

  describe("patching a collection", () => {
    it("replaces the element list wholesale, as RFC 7396 prescribes for arrays", async () => {
      const target = await freshDpp();

      const patched = await organization.admin.patch<{ collection: Collection }>(
        `/dpps/${target}/collections/material`,
        { dataElements: [publicElement("anteil", "80 %")] },
      );

      expect(patched.status).toBe(200);
      expect(patched.body.collection.dataElements).toHaveLength(1);
      expect(
        (await organization.admin.get(`/dpps/${target}/elements/material/herkunft`)).status,
      ).toBe(404);
    });
  });

  // The point that decides whether the fine-grained API is a second write
  // path with its own rules, or the same one with a different address.
  describe("the same guards as a whole-passport patch", () => {
    it("refuses an editor writing an element only admins may write", async () => {
      const target = await freshDpp();

      const response = await editor.patch<Messages>(`/dpps/${target}/elements/einkaufspreis`, {
        value: "1 EUR",
      });

      expect(response.status).toBe(403);
      expect(response.body.messages[0]?.code).toBe("DPP_ELEMENT_WRITE_FORBIDDEN");
    });

    // The bypass in its sharpest form: relaxing the policy and writing in one
    // move. Authorization checks against the **stored** policy.
    it("refuses an editor who relaxes the policy in the same patch", async () => {
      const target = await freshDpp();

      const response = await editor.patch(`/dpps/${target}/elements/einkaufspreis`, {
        policy: { readRoles: ["admin", "editor"], writeRoles: ["admin", "editor"] },
        value: "1 EUR",
      });

      expect(response.status).toBe(403);

      const stored = await organization.admin.get<{ element: Element }>(
        `/dpps/${target}/elements/einkaufspreis`,
      );
      expect(stored.body.element.value).toBe("42 EUR");
    });

    it("does not let a viewer patch at all", async () => {
      const target = await freshDpp();

      const response = await viewer.patch(`/dpps/${target}/elements/gewicht`, { value: "0 kg" });

      expect(response.status).toBe(403);
    });

    it("refuses to patch a published passport", async () => {
      const target = await freshDpp();
      await publishDpp(organization.admin, target);

      const response = await organization.admin.patch(`/dpps/${target}/elements/gewicht`, {
        value: "99 kg",
      });

      expect(response.status).toBe(409);
    });

    it("hides another tenant's passport", async () => {
      const rival = await createOrganization("fine-rival");

      expect((await rival.admin.get(`/dpps/${dppId}/elements/gewicht`)).status).toBe(404);
      expect(
        (await rival.admin.patch(`/dpps/${dppId}/elements/gewicht`, { value: "x" })).status,
      ).toBe(404);
    });

    it("records the change in the audit trail", async () => {
      const target = await freshDpp();
      await organization.admin.patch(`/dpps/${target}/elements/gewicht`, { value: "15 kg" });

      const audit = await organization.admin.get<{ audit: { eventType: string }[] }>(
        `/dpps/${target}/audit-events`,
      );

      expect(audit.body.audit.map((entry) => entry.eventType)).toContain("dpp.updated");
    });

    it("keeps a version, so the change can be undone", async () => {
      const target = await freshDpp();
      await organization.admin.patch(`/dpps/${target}/elements/gewicht`, { value: "16 kg" });

      const versions = await organization.admin.get<{ versions: unknown[] }>(
        `/dpps/${target}/versions`,
      );

      expect(versions.body.versions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
