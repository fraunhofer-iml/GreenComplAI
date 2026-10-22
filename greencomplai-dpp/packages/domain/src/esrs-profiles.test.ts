import { describe, expect, it } from "vitest";

import { ESRS_PROFILES, findEsrsProfile, readEnabledProfiles } from "./esrs-profiles.js";
import { SUSTAINABILITY_METRICS } from "./sustainability.js";

describe("ESRS-Profile", () => {
  describe("the platform owns the profile catalog", () => {
    it("keeps keys, category IDs and datapoints unique within a profile", () => {
      const keys = ESRS_PROFILES.map((profile) => profile.key);
      const categories = ESRS_PROFILES.map((profile) => profile.category.id);

      expect(new Set(keys).size).toBe(keys.length);
      expect(new Set(categories).size).toBe(categories.length);

      for (const profile of ESRS_PROFILES) {
        const uris = profile.datapoints.map((datapoint) => datapoint.canonicalUri);
        const entryKeys = profile.datapoints.map((datapoint) => datapoint.entryKey);

        expect(new Set(uris).size).toBe(uris.length);
        expect(new Set(entryKeys).size).toBe(entryKeys.length);
      }
    });

    // A tenant is fairly likely to already have a field named `weight` -
    // which could mean the packaging weight instead. Without a prefix, a
    // write would have to choose between aborting or overwriting a foreign
    // meaning.
    it("prefixes entry keys to avoid collisions", () => {
      for (const profile of ESRS_PROFILES) {
        for (const datapoint of profile.datapoints) {
          expect(datapoint.entryKey).toMatch(/^esrs[A-Z]/);
        }
      }
    });

    it("nennt zu jedem Profil Standard, Beschreibung und mindestens einen Pflichtdatenpunkt", () => {
      for (const profile of ESRS_PROFILES) {
        expect(profile.standard).toMatch(/^E[1-5]$/);
        expect(profile.description.length).toBeGreaterThan(40);
        expect(profile.maturity).toBe("provisional");
        expect(profile.datapoints.filter((datapoint) => datapoint.required).length).toBeGreaterThan(
          0,
        );
      }
    });

    // As long as the revised ESRS are not yet applicable and the new EFRAG
    // taxonomy is still pending, no profile may pretend to be final.
    it("deckt E1 bis E5 ab", () => {
      expect(new Set(ESRS_PROFILES.map((profile) => profile.standard))).toEqual(
        new Set(["E1", "E2", "E3", "E4", "E5"]),
      );
    });
  });

  // The purpose of the checklist: whatever it sets must actually arrive in
  // the reporting feed. Otherwise a checkmark creates fields that feed
  // nothing.
  describe("profile selection and metrics are consistent", () => {
    it("liefert zu jeder Kennzahl einen Datenpunkt aus einem Profil", () => {
      for (const metric of SUSTAINABILITY_METRICS) {
        const provided = ESRS_PROFILES.flatMap((profile) =>
          profile.datapoints.map((datapoint) => datapoint.canonicalUri),
        );

        expect(
          metric.canonicalUris.some((uri) => provided.includes(uri)),
          `Kennzahl ${metric.key} wird von keinem Profil befüllt`,
        ).toBe(true);
      }
    });

    // No mass, no weighted share - a profile that feeds a weighted metric
    // must therefore bring the mass itself.
    it("includes mass in each profile with a weighted metric", () => {
      for (const metric of SUSTAINABILITY_METRICS) {
        if (metric.aggregation !== "mass-weighted-share") continue;

        const profiles = ESRS_PROFILES.filter((profile) =>
          profile.datapoints.some((datapoint) =>
            metric.canonicalUris.includes(datapoint.canonicalUri),
          ),
        );

        for (const profile of profiles) {
          expect(
            profile.datapoints.some(
              (datapoint) => datapoint.canonicalUri === "https://data.europa.eu/dpp/weight",
            ),
          ).toBe(true);
        }
      }
    });
  });

  describe("gesetzte Profile lesen", () => {
    it("finds a profile by key", () => {
      expect(findEsrsProfile("esrs-e4-biodiversity")?.standard).toBe("E4");
      expect(findEsrsProfile("gibt-es-nicht")).toBeUndefined();
    });

    // A profile that no longer exists must not pretend to impose a
    // requirement.
    it("rejects unknown keys and non-array input", () => {
      expect(readEnabledProfiles({ esrsProfiles: ["esrs-e2-pollution", "weg"] })).toEqual([
        "esrs-e2-pollution",
      ]);
      expect(readEnabledProfiles({ esrsProfiles: "esrs-e2-pollution" })).toEqual([]);
      expect(readEnabledProfiles(null)).toEqual([]);
      expect(readEnabledProfiles(undefined)).toEqual([]);
    });
  });
});
