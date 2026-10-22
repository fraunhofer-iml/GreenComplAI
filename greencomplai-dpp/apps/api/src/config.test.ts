import { describe, expect, it } from "vitest";

import { assertProductionSecrets, parseConnectorBaseUrls } from "./config.js";

describe("production secret configuration", () => {
  const production = {
    NODE_ENV: "production",
    BETTER_AUTH_SECRET: "generated-auth-secret-for-this-test",
    DATABASE_URL: "postgres://operator:deployment-password@database:5432/passports",
    S3_ACCESS_KEY_ID: "deployment-storage-user",
    S3_SECRET_ACCESS_KEY: "generated-storage-secret-for-this-test",
  };

  it("accepts explicitly configured deployment values", () => {
    expect(() => assertProductionSecrets(production)).not.toThrow();
  });

  it.each([
    ["BETTER_AUTH_SECRET", undefined],
    ["BETTER_AUTH_SECRET", ""],
    ["BETTER_AUTH_SECRET", "   "],
    ["BETTER_AUTH_SECRET", "local-development-secret-change-me"],
    ["BETTER_AUTH_SECRET", "replace-with-a-long-random-secret"],
    ["BETTER_AUTH_SECRET", " replace-with-a-long-random-secret "],
    ["DATABASE_URL", "postgres://dpp:dpp@localhost:5432/dpp"],
    ["S3_ACCESS_KEY_ID", "minio"],
    ["S3_SECRET_ACCESS_KEY", "minio123"],
  ])("rejects an unsafe %s without including its value in the error", (key, value) => {
    expect(() => assertProductionSecrets({ ...production, [key]: value })).toThrow(key);
    if (value?.trim()) {
      try {
        assertProductionSecrets({ ...production, [key]: value });
      } catch (error) {
        expect(String(error)).not.toContain(value.trim());
      }
    }
  });

  it("keeps local development usable without deployment secrets", () => {
    expect(() => assertProductionSecrets({ NODE_ENV: "development" })).not.toThrow();
  });
});

// Redirecting a connector at a local mock is a development convenience. It is
// also the one switch that decides where a module's stored credentials travel,
// so the interesting cases here are the refusals, not the happy path.

describe("pointing a connector at another host", () => {
  it("reads a key=url pair", () => {
    expect(parseConnectorBaseUrls("simpl=http://localhost:4010", "development")).toEqual(
      new Map([["simpl", "http://localhost:4010"]]),
    );
  });

  it("keeps only the origin - the allowlist works on paths", () => {
    expect(
      parseConnectorBaseUrls("simpl=http://localhost:4010/some/prefix", "development").get("simpl"),
    ).toBe("http://localhost:4010");
  });

  it("is empty when unset", () => {
    expect(parseConnectorBaseUrls(undefined, "development").size).toBe(0);
    expect(parseConnectorBaseUrls("  ", "development").size).toBe(0);
  });

  it("refuses to run in production", () => {
    // Not a warning: in production this would send a tenant's ERP credentials
    // to a host their connector's manifest does not name.
    expect(() => parseConnectorBaseUrls("simpl=http://localhost:4010", "production")).toThrow(
      /Refusing to start in production/,
    );
  });

  it("does not stand in the way of a production start when unset", () => {
    expect(() => parseConnectorBaseUrls(undefined, "production")).not.toThrow();
  });

  it("fails on a typo instead of talking to a slightly wrong host", () => {
    expect(() => parseConnectorBaseUrls("simpl", "development")).toThrow(
      /not a "connectorKey=url"/,
    );
    expect(() => parseConnectorBaseUrls("simpl=nonsense", "development")).toThrow(/is not a URL/);
    expect(() => parseConnectorBaseUrls("simpl=ftp://host", "development")).toThrow(
      /not an http\(s\) URL/,
    );
  });
});
