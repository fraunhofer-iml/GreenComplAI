import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp } from "./helpers/dpp.js";

// Until now a facility was a free-text string in `dpps.facilityId` with
// nothing to check it against. Whatever was typed just sat there - two
// spellings of the same plant were two plants.

type Facility = {
  countryCode?: string | null;
  facilityId: string;
  facilityType: string;
  name: string;
  operatorId?: string | null;
};
type Messages = { messages: { code?: string; path?: string; text: string }[] };

describe("facilities", () => {
  let organization: OrganizationFixture;
  let rival: OrganizationFixture;
  let viewer: TestClient;
  let operatorId: string;
  let facilityId: string;

  beforeAll(async () => {
    organization = await createOrganization("facility");
    rival = await createOrganization("facility-rival");
    viewer = await addMember(organization, "viewer");

    operatorId = `OP-${randomUUID().slice(0, 8)}`;
    await organization.admin.post("/economic-operators", {
      operatorId,
      legalName: "Werk Betreiber GmbH",
      roles: ["manufacturer"],
    });

    facilityId = `WERK-${randomUUID().slice(0, 8)}`;
  });

  describe("management", () => {
    it("creates a facility", async () => {
      const response = await organization.admin.post<{ facility: Facility }>("/facilities", {
        facilityId,
        name: "Werk Nord",
        facilityType: "manufacturing",
        operatorId,
        countryCode: "DE",
      });

      expect(response.status).toBe(201);
      expect(response.body.facility.name).toBe("Werk Nord");
      expect(response.body.facility.operatorId).toBe(operatorId);
    });

    it("defaults the type rather than demanding one", async () => {
      const response = await organization.admin.post<{ facility: Facility }>("/facilities", {
        facilityId: `WERK-${randomUUID().slice(0, 8)}`,
        name: "Werk ohne Typangabe",
      });

      expect(response.status).toBe(201);
      expect(response.body.facility.facilityType).toBe("manufacturing");
    });

    it("reads a facility through its business key", async () => {
      const response = await organization.admin.get<{ facility: Facility }>(
        `/facilities/${facilityId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.facility.facilityId).toBe(facilityId);
    });

    it("patches a facility", async () => {
      const response = await organization.admin.patch<{ facility: Facility }>(
        `/facilities/${facilityId}`,
        { name: "Werk Nord (umbenannt)", facilityType: "assembly" },
      );

      expect(response.status).toBe(200);
      expect(response.body.facility.name).toBe("Werk Nord (umbenannt)");
      expect(response.body.facility.facilityType).toBe("assembly");
    });

    it("does not let a viewer create one", async () => {
      const response = await viewer.post("/facilities", {
        facilityId: `WERK-${randomUUID().slice(0, 8)}`,
        name: "Heimlich",
      });

      expect(response.status).toBe(403);
    });

    it("refuses an unknown operator as the site's operator", async () => {
      const response = await organization.admin.post<Messages>("/facilities", {
        facilityId: `WERK-${randomUUID().slice(0, 8)}`,
        name: "Werk mit erfundenem Betreiber",
        operatorId: "OP-GIBT-ES-NICHT",
      });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("operatorId");
      expect(response.body.messages[0]?.code).toBe("FACILITY_REFERENCE_NOT_FOUND");
    });
  });

  describe("tenant isolation", () => {
    it("hides a facility from another organization", async () => {
      const response = await rival.admin.get(`/facilities/${facilityId}`);

      expect(response.status).toBe(404);
    });

    it("does not list another organization's facilities", async () => {
      const response = await rival.admin.get<{ facilities: Facility[] }>("/facilities");

      expect(response.status).toBe(200);
      expect(response.body.facilities.map((facility) => facility.facilityId)).not.toContain(
        facilityId,
      );
    });

    // The same facility number in two tenants is not a conflict: the key
    // applies per organization.
    it("lets two organizations use the same facility key", async () => {
      const response = await rival.admin.post("/facilities", {
        facilityId,
        name: "Gleiche Nummer, anderes Werk",
      });

      expect(response.status).toBe(201);
    });
  });

  // The reason this model exists: the passport references it, and the
  // reference is now looked up (G21).
  describe("referenced by a passport", () => {
    it("accepts a passport pointing at an existing facility", async () => {
      const dpp = await createDraftDpp(organization.admin, {});

      const response = await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { facilityId },
      });

      expect(response.status).toBe(200);
    });

    it("refuses a passport pointing at a facility that does not exist", async () => {
      const dpp = await createDraftDpp(organization.admin, {});

      const response = await organization.admin.patch<Messages>(`/dpps/${dpp.publicId}`, {
        snapshot: { facilityId: "WERK-GIBT-ES-NICHT" },
      });

      expect(response.status).toBe(422);
      expect(response.body.messages[0]?.path).toBe("facilityId");
    });

    it("accepts a passport without a facility at all", async () => {
      // Not every passport names a facility; the check only applies when one is
      // given.
      const dpp = await createDraftDpp(organization.admin, {});

      const response = await organization.admin.patch(`/dpps/${dpp.publicId}`, {
        snapshot: { granularity: "item" },
      });

      expect(response.status).toBe(200);
    });
  });
});
