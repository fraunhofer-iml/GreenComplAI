import { createReadOnlyHttpClient, ForbiddenRouteError } from "@dpp/connector-sdk";
import { describe, expect, it, vi } from "vitest";

import { SIMPL_ALLOWLIST, SIMPL_BASE_URL } from "./index.js";

// These tests exercise the local permission boundary without redistributing
// the vendor's specification. They do not check upstream API compatibility.
describe("SIMPL route permissions", () => {
  it("exposes only read methods", () => {
    expect(SIMPL_ALLOWLIST.every((route) => route.method === "GET")).toBe(true);
    const http = createReadOnlyHttpClient({
      baseUrl: SIMPL_BASE_URL,
      allowlist: SIMPL_ALLOWLIST,
    });
    expect(Object.keys(http).sort()).toEqual(["get", "getBinary", "tryGet"]);
  });

  it.each([
    "/v1/accounts",
    "/v1/auth",
    "/v1/assets",
    "/v1/assets/sample-id/delete",
    "/v1/assets/sample-id/resources",
    "/v1/resources",
    "/v1/unknown-future-endpoint",
  ])("rejects ungranted path %s before any network request", async (path) => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const http = createReadOnlyHttpClient({
      baseUrl: SIMPL_BASE_URL,
      allowlist: SIMPL_ALLOWLIST,
      fetchImpl,
    });

    await expect(http.get(path)).rejects.toBeInstanceOf(ForbiddenRouteError);
    await expect(http.getBinary(path)).rejects.toBeInstanceOf(ForbiddenRouteError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
