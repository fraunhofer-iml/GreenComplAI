import { isDppPublicId } from "@dpp/domain";
import { describe, expect, it } from "vitest";

import { demoDpps, demoDppVersionsByDigitalId, demoPublicId } from "./demo.js";

// The demo tenant's public ids are assigned by hand so they stay readable in
// links and screenshots. That is exactly the danger: they still have to be
// valid public ids - 12 characters of base58, so no 0/O/I/l.
//
// Invalid IDs would resolve as missing passports instead of public links.

describe("demo public ids", () => {
  it("has a published version for each published demo passport", () => {
    for (const dpp of Object.values(demoDpps)) {
      expect(
        demoDppVersionsByDigitalId[dpp.digitalProductPassportId]?.some(
          (version) =>
            version.status === "published" && version.snapshot.productId === dpp.productId,
        ),
      ).toBe(true);
    }
  });
  it.each(Object.keys(demoDpps))("%s resolves to a valid public id", (urn) => {
    expect(isDppPublicId(demoPublicId(urn))).toBe(true);
  });

  it("gives every demo passport its own", () => {
    const ids = Object.keys(demoDpps).map(demoPublicId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("still derives one for a passport it does not know", () => {
    expect(isDppPublicId(demoPublicId("urn:dpp:something-else"))).toBe(true);
  });
});
