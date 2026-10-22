import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { controlledElement, createDraftDpp, publicElement } from "./helpers/dpp.js";

// prEN 18239 5.2 no. 24/25: element-level access is fail-closed, and the policy
// governing a write is the stored one — never the one the client just sent.
describe("element policies", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;
  let viewer: TestClient;

  beforeAll(async () => {
    organization = await createOrganization("policy");
    editor = await addMember(organization, "editor");
    viewer = await addMember(organization, "viewer");
  });

  describe("fail-closed reads", () => {
    it("hides a controlled element without a policy from a viewer", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          publicElement("public-field", "visible"),
          controlledElement("secret", "hidden"),
        ],
      });

      const asViewer = await viewer.get<{
        view: { dpp: { dataElements: { elementId: string }[] } };
      }>(`/dpps/${dpp.publicId}/view`);

      const ids = asViewer.body.view.dpp.dataElements.map((element) => element.elementId);
      expect(ids).toContain("public-field");
      expect(ids).not.toContain("secret");
    });

    it("still shows a controlled element to the admin override", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [controlledElement("secret", "hidden")],
      });

      const asAdmin = await organization.admin.get<{
        view: { dpp: { dataElements: { elementId: string }[] } };
      }>(`/dpps/${dpp.publicId}/view`);

      expect(asAdmin.body.view.dpp.dataElements.map((element) => element.elementId)).toContain(
        "secret",
      );
    });

    it("shows a controlled element to a role its policy names", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          controlledElement("shared", "value", { readRoles: ["viewer"], writeRoles: ["admin"] }),
        ],
      });

      const asViewer = await viewer.get<{
        view: { dpp: { dataElements: { elementId: string }[] } };
      }>(`/dpps/${dpp.publicId}/view`);

      expect(asViewer.body.view.dpp.dataElements.map((element) => element.elementId)).toContain(
        "shared",
      );
    });
  });

  describe("write authorization", () => {
    it("refuses an editor writing an element only admins may write", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          controlledElement("admin-only", "original", {
            readRoles: ["admin"],
            writeRoles: ["admin"],
          }),
        ],
      });

      const response = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: {
          dataElements: [
            controlledElement("admin-only", "tampered", {
              readRoles: ["admin"],
              writeRoles: ["admin"],
            }),
          ],
        },
      });

      expect(response.status).toBe(403);
    });

    // The core bypass: relax the policy and write the value in the same patch.
    // Authorizing against the *sent* policy would let this through.
    it("refuses an editor who relaxes the policy and writes in one patch", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          controlledElement("admin-only", "original", {
            readRoles: ["admin"],
            writeRoles: ["admin"],
          }),
        ],
      });

      const response = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: {
          dataElements: [
            controlledElement("admin-only", "tampered", {
              readRoles: ["admin", "editor"],
              writeRoles: ["admin", "editor"],
            }),
          ],
        },
      });

      expect(response.status).toBe(403);

      const stored = await organization.admin.get<{
        view: { dpp: { dataElements: { value: unknown }[] } };
      }>(`/dpps/${dpp.publicId}/view`);
      expect(stored.body.view.dpp.dataElements[0]?.value).toBe("original");
    });

    it("refuses an editor changing a policy even where they may write the value", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          controlledElement("shared", "original", {
            readRoles: ["admin", "editor"],
            writeRoles: ["admin", "editor"],
          }),
        ],
      });

      const response = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: {
          dataElements: [
            controlledElement("shared", "original", {
              readRoles: ["admin", "editor", "viewer"],
              writeRoles: ["admin", "editor"],
            }),
          ],
        },
      });

      expect(response.status).toBe(403);
    });

    it("allows an editor to write a value their policy permits", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          controlledElement("shared", "original", {
            readRoles: ["admin", "editor"],
            writeRoles: ["admin", "editor"],
          }),
        ],
      });

      const response = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: {
          dataElements: [
            controlledElement("shared", "updated", {
              readRoles: ["admin", "editor"],
              writeRoles: ["admin", "editor"],
            }),
          ],
        },
      });

      expect(response.status).toBe(200);
    });

    it("does not let a viewer patch at all", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("open", "value")],
      });

      const response = await viewer.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("open", "tampered")] },
      });

      // Blocked by the route's role gate before policy evaluation even runs.
      expect(response.status).toBe(403);
    });
  });
});
