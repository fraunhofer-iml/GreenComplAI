import { describe, expect, it } from "vitest";

import { assetToProduct } from "../mapping.js";
import { ASSET_TYPES, ASSETS, ORGANIZATIONS, PARTS, RESOURCES } from "./fixtures.js";
import { assertNoDrift, MOCK_ROUTES, route } from "./routes.js";

// The mock is development scaffolding, so the question here is not whether it
// behaves like SIMPL. It is whether it still lines up with the module: a mock
// that has drifted is worse than none, because it makes something work locally
// that cannot work against the real system.

describe("what the mock answers", () => {
  it("stays inside what the module is allowed to call", () => {
    expect(() => assertNoDrift()).not.toThrow();
  });

  it("matches a path with an identifier in it", () => {
    expect(route("GET", new URL("http://x/v1/assets/ERP-1001?externalId=true"))).toEqual({
      params: ["ERP-1001"],
      path: "/v1/assets/{id}",
    });
    expect(route("GET", new URL("http://x/v1/resources/res-1/file"))).toEqual({
      params: ["res-1"],
      path: "/v1/resources/{id}/file",
    });
  });

  it("answers nothing but GET", () => {
    // The read-only guarantee is the platform's, not the mock's - but a mock
    // that accepted a POST would let a broken guarantee pass unnoticed here.
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(route(method, new URL("http://x/v1/assets/ERP-1001"))).toBeUndefined();
    }
  });

  it("does not answer a path it has no route for", () => {
    expect(route("GET", new URL("http://x/v1/assets"))).toBeUndefined();
    expect(route("GET", new URL("http://x/v1/users/me"))).toBeUndefined();
  });

  it("distinguishes the external identifier from the internal one", () => {
    const handler = MOCK_ROUTES.find((entry) => entry.path === "/v1/assets/{id}")!;

    expect(handler.handle(["ERP-1001"], new URL("http://x/?externalId=true")).status).toBe(200);
    // Without the flag, `ERP-1001` is not an internal id and must not resolve -
    // otherwise a wrong lookup order would still look right locally.
    expect(handler.handle(["ERP-1001"], new URL("http://x/")).status).toBe(404);
    expect(handler.handle(["a-1001"], new URL("http://x/")).status).toBe(200);
  });
});

describe("the fixtures", () => {
  it("reference only records the mock can serve", () => {
    const assetTypeIds = new Set(ASSET_TYPES.map((entry) => entry.id));
    const organizationIds = new Set(ORGANIZATIONS.map((entry) => entry.id));

    for (const asset of ASSETS) {
      if (asset.assetType?.id) expect(assetTypeIds).toContain(asset.assetType.id);
      if (asset.manufacturer?.id) expect(organizationIds).toContain(asset.manufacturer.id);
      for (const resource of asset.resources ?? []) {
        expect(Object.keys(RESOURCES)).toContain(resource.id);
      }
    }

    for (const part of PARTS) {
      if (part.manufacturer?.id) expect(organizationIds).toContain(part.manufacturer.id);
    }
  });

  it("map to products through the module's own mapping", () => {
    for (const asset of ASSETS) {
      const assetType = ASSET_TYPES.find((entry) => entry.id === asset.assetType?.id);
      const product = assetToProduct(asset, { assetType });

      expect(product, `${asset.externalId} does not map to a product`).toBeDefined();
      expect(product?.externalId).toBe(asset.externalId);
    }
  });

  it("give the wizard something to work with", () => {
    // The whole point of the mock is a record kind with enough fields that the
    // dictionary draft is worth looking at. One or two would demo nothing.
    const standard = ASSETS.find((asset) => asset.externalId === "ERP-1001")!;
    const product = assetToProduct(standard, {
      assetType: ASSET_TYPES.find((entry) => entry.id === "at-pressure"),
    })!;

    expect(product.attributes.length).toBeGreaterThanOrEqual(12);
    // A stated type, a guessed one, and a closed value list - the three cases
    // the draft has to tell apart.
    expect(product.attributes.some((entry) => entry.valueType === "number")).toBe(true);
    expect(product.attributes.some((entry) => entry.valueType === "enum")).toBe(true);
    expect(product.attributes.some((entry) => entry.valueType === undefined)).toBe(true);
  });

  it("serve bytes that are what their content type claims", () => {
    // The platform checks the signature against the actual bytes, so a text
    // file named .pdf would be rejected - correct behaviour, bad demo.
    expect(RESOURCES["res-1"]!.body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect([...RESOURCES["res-2"]!.body.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
