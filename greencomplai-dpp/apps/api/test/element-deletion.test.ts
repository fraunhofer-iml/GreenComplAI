import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { controlledElement, createDraftDpp, publicElement } from "./helpers/dpp.js";

// deleting is a write.
//
// The check previously ran only against the **new** state. An element that
// was stored and missing from the patch was never checked - which led to two
// bugs, the second one worse:
//
//   1. An editor could **deliberately** remove an admin-only element.
//   2. An editor destroyed it during an **ordinary save**. They see only what
//      `filterSnapshotForRole` shows them and send back exactly that; every
//      invisible element was therefore missing from every one of their
//      patches and got deleted when the lists were replaced. Status 200, no
//      warning.
//
// The rule is split in two: invisible elements are preserved (their absence
// carries no meaning), and a visible element that is missing counts as a
// deletion and requires write permission on exactly that element.

type View = { view: { dpp: { dataElements: { elementId: string; value?: unknown }[] } } };
type Collections = {
  view: { dpp: { collections: { dataElements: { elementId: string }[]; elementId: string }[] } };
};
type Messages = { messages: { code?: string; text: string }[] };

const adminOnly = (elementId: string, value: string) =>
  controlledElement(elementId, value, { readRoles: ["admin"], writeRoles: ["admin"] });

const sharedWithEditor = (elementId: string, value: string) =>
  controlledElement(elementId, value, {
    readRoles: ["admin", "editor"],
    writeRoles: ["admin", "editor"],
  });

describe("deleting an element", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;

  beforeAll(async () => {
    organization = await createOrganization("delete");
    editor = await addMember(organization, "editor");
  });

  const elementIds = async (publicId: string) =>
    (await organization.admin.get<View>(`/dpps/${publicId}/view`)).body.view.dpp.dataElements.map(
      (element) => element.elementId,
    );

  // The actual harm: not an attack, but the ordinary case.
  describe("an ordinary save must not destroy what the editor cannot see", () => {
    it("keeps a controlled element the editor never received", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("offen", "alt"), adminOnly("nur-admin", "geheim")],
      });

      // Exactly what the editor sends back from their filtered view.
      const seen = await editor.get<View>(`/dpps/${dpp.publicId}/view`);
      expect(seen.body.view.dpp.dataElements.map((element) => element.elementId)).toEqual([
        "offen",
      ]);

      const saved = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("offen", "neu")] },
      });
      expect(saved.status).toBe(200);

      expect(await elementIds(dpp.publicId)).toEqual(
        expect.arrayContaining(["offen", "nur-admin"]),
      );
    });

    it("keeps the value of the invisible element untouched", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("offen", "alt"), adminOnly("nur-admin", "geheim")],
      });

      await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("offen", "neu")] },
      });

      const stored = await organization.admin.get<View>(`/dpps/${dpp.publicId}/view`);
      const hidden = stored.body.view.dpp.dataElements.find(
        (element) => element.elementId === "nur-admin",
      );
      expect(hidden?.value).toBe("geheim");
      // And the actual change went through.
      expect(
        stored.body.view.dpp.dataElements.find((element) => element.elementId === "offen")?.value,
      ).toBe("neu");
    });

    it("does the same for an element inside a collection", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        collections: [
          {
            elementId: "material",
            kind: "collection",
            visibility: "public",
            dataElements: [publicElement("anteil", "40 %"), adminOnly("einkauf", "geheim")],
          },
        ],
      });

      await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: {
          collections: [
            {
              elementId: "material",
              kind: "collection",
              visibility: "public",
              dataElements: [publicElement("anteil", "60 %")],
            },
          ],
        },
      });

      const stored = await organization.admin.get<Collections>(`/dpps/${dpp.publicId}/view`);
      expect(
        stored.body.view.dpp.collections[0]?.dataElements.map((child) => child.elementId),
      ).toEqual(expect.arrayContaining(["anteil", "einkauf"]));
    });

    it("keeps a whole collection the editor cannot see", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        collections: [
          {
            elementId: "intern",
            kind: "collection",
            visibility: "controlled",
            policy: { readRoles: ["admin"], writeRoles: ["admin"] },
            dataElements: [adminOnly("kalkulation", "geheim")],
          },
        ],
        dataElements: [publicElement("offen", "alt")],
      });

      await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { collections: [], dataElements: [publicElement("offen", "neu")] },
      });

      const stored = await organization.admin.get<Collections>(`/dpps/${dpp.publicId}/view`);
      expect(stored.body.view.dpp.collections.map((collection) => collection.elementId)).toContain(
        "intern",
      );
    });
  });

  describe("removing something visible is a write", () => {
    it("lets an editor remove an element they may write", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("bleibt", "x"), publicElement("geht", "y")],
      });

      const response = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("bleibt", "x")] },
      });

      expect(response.status).toBe(200);
      expect(await elementIds(dpp.publicId)).toEqual(["bleibt"]);
    });

    // The case that previously slipped through: visible, but not writable.
    it("refuses to remove an element the editor may read but not write", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [
          publicElement("offen", "x"),
          controlledElement("nur-lesbar", "y", {
            readRoles: ["admin", "editor"],
            writeRoles: ["admin"],
          }),
        ],
      });

      const response = await editor.patch<Messages>(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("offen", "x")] },
      });

      expect(response.status).toBe(403);
      expect(response.body.messages[0]?.code).toBe("DPP_ELEMENT_WRITE_FORBIDDEN");
      expect(await elementIds(dpp.publicId)).toEqual(
        expect.arrayContaining(["offen", "nur-lesbar"]),
      );
    });

    it("refuses to remove a collection the editor may read but not write", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        collections: [
          {
            elementId: "gesperrt",
            kind: "collection",
            visibility: "controlled",
            policy: { readRoles: ["admin", "editor"], writeRoles: ["admin"] },
            dataElements: [sharedWithEditor("wert", "x")],
          },
        ],
      });

      const response = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { collections: [] },
      });

      expect(response.status).toBe(403);
    });

    it("still lets an admin remove anything", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("offen", "x"), adminOnly("nur-admin", "geheim")],
      });

      const response = await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("offen", "x")] },
      });

      expect(response.status).toBe(200);
      expect(await elementIds(dpp.publicId)).toEqual(["offen"]);
    });
  });

  // What used to be the documented finding - and now fails.
  describe("the deliberate attack", () => {
    it("refuses an editor removing an admin-only element on purpose", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("offen", "sichtbar"), adminOnly("nur-admin", "geheim")],
      });

      // The editor knows the element ID (say, from another role's export) and
      // deliberately leaves it out. Since they may not read it, it is
      // preserved as invisible - the attempt runs into a dead end instead of
      // through.
      const response = await editor.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { dataElements: [publicElement("offen", "sichtbar")] },
      });

      expect(response.status).toBe(200);
      expect(await elementIds(dpp.publicId)).toEqual(
        expect.arrayContaining(["offen", "nur-admin"]),
      );
    });
  });
});
