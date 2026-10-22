import { describe, expect, it } from "vitest";

import { assertSafeDemoSeed } from "../../../packages/db/src/seed-policy.js";

describe("production demo seeding", () => {
  it.each([undefined, "", "   "])(
    "refuses a production seed without a target organization",
    (id) => {
      expect(() =>
        assertSafeDemoSeed({ NODE_ENV: "production", SEED_ORGANIZATION_ID: id }),
      ).toThrow(/Refusing to seed a demo administrator/);
    },
  );

  it("also refuses creating a production demo tenant with a custom password", () => {
    expect(() =>
      assertSafeDemoSeed({ NODE_ENV: "production", DEMO_ADMIN_PASSWORD: "custom-password" }),
    ).toThrow(/SEED_ORGANIZATION_ID/);
  });

  it("allows the installer's account-free seed into an existing organization", () => {
    expect(() =>
      assertSafeDemoSeed({ NODE_ENV: "production", SEED_ORGANIZATION_ID: "existing-org" }),
    ).not.toThrow();
  });

  it("allows a local demo tenant", () => {
    expect(() => assertSafeDemoSeed({ NODE_ENV: "development" })).not.toThrow();
  });
});
