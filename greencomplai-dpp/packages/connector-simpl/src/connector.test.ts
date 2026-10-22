import {
  ConnectorAuthError,
  createReadOnlyHttpClient,
  type ConnectorContext,
} from "@dpp/connector-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SIMPL_ALLOWLIST, SIMPL_BASE_URL, simplConnector } from "./index.js";

// The module against a fake SIMPL - but through the **real** read-only
// client. A test that replaced the client with a mock would remove exactly
// the boundary this is about.

type Route = (url: URL) => Response | undefined;

let routes: Route[] = [];
let calls: { method: string; url: string }[] = [];

// `RequestInfo` is not a global type under @types/node - `fetch`'s own input
// type is the reliable source for it.
const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = input instanceof URL ? input : new URL(String(input));
  calls.push({ method: init?.method ?? "GET", url: `${url.pathname}${url.search}` });

  for (const route of routes) {
    const response = route(url);
    if (response) return response;
  }

  return new Response("", { status: 404 });
}) as unknown as typeof fetch;

function context(): ConnectorContext {
  return {
    http: createReadOnlyHttpClient({
      baseUrl: SIMPL_BASE_URL,
      allowlist: SIMPL_ALLOWLIST,
      fetchImpl,
      authorize: async () => ({ authorization: "Bearer test-token" }),
    }),
    config: {},
    log: () => {},
  };
}

function json(pathname: string, body: unknown, query?: Record<string, string>): Route {
  return (url) => {
    if (url.pathname !== pathname) return undefined;
    for (const [key, value] of Object.entries(query ?? {})) {
      if (url.searchParams.get(key) !== value) return undefined;
    }

    return Response.json(body);
  };
}

const ASSET = {
  id: "a-internal",
  externalId: "ERP-4711",
  title: "Hochdruckaggregat",
  type: "Aggregat",
  description: "Steht in Halle 3",
  serialNumber: "SN-4711",
  status: "RUNNING",
  manufacturer: { id: "org-9", title: "Muster Maschinenbau GmbH", type: "MANUFACTURER" },
  location: { city: "Dortmund", country: "DE", title: "Werk Nord" },
  customFields: { "cf-a1": 12.5, "cf-b2": "Edelstahl", "cf-c3": "" },
  assetType: { id: "at-1", title: "Hochdruckaggregate" },
  resources: [{ id: "res-1", name: "Datenblatt.pdf", type: "application/pdf", isPublic: true }],
  updatedAt: "2026-07-01T10:00:00Z",
};

const ASSET_TYPE = {
  id: "at-1",
  title: "Hochdruckaggregate",
  customFields: {
    properties: {
      "cf-a1": { title: "Betriebsdruck", type: "number", unit: "bar" },
      "cf-b2": { title: "Werkstoff", type: "string" },
    },
  },
};

const ORGANIZATION = {
  id: "org-9",
  title: "Muster Maschinenbau GmbH",
  type: "MANUFACTURER",
  locations: [
    { city: "Hamburg", country: "DE", isPrimary: false, street: "Nebenweg" },
    {
      buildingNumber: "12a",
      city: "Dortmund",
      country: "DE",
      isPrimary: true,
      postal: "44139",
      street: "Musterstraße",
    },
  ],
};

beforeEach(() => {
  routes = [];
  calls = [];
  (fetchImpl as unknown as ReturnType<typeof vi.fn>).mockClear();
});

describe("looking an asset up", () => {
  beforeEach(() => {
    routes = [
      json("/v1/assets/ERP-4711", ASSET, { externalId: "true" }),
      json("/v1/asset-types/at-1", ASSET_TYPE),
      json("/v1/organizations/org-9", ORGANIZATION),
    ];
  });

  it("maps it onto the catalogue's vocabulary", async () => {
    const product = await simplConnector.lookupByExternalId(context(), "ERP-4711");

    expect(product).toMatchObject({
      externalId: "ERP-4711",
      name: "Hochdruckaggregat",
      description: "Steht in Halle 3",
      // The structured asset type wins over the free-text title.
      category: "Hochdruckaggregate",
      identifiers: [
        { type: "serialNumber", value: "SN-4711", issuer: "simpl" },
        // The type designation as the model identifier - as a category it
        // would have disappeared behind the coarse asset type.
        { type: "model", value: "Aggregat", issuer: "simpl" },
      ],
      updatedAt: "2026-07-01T10:00:00Z",
    });
  });

  it("resolves the generated custom-field keys through the asset type", async () => {
    const product = await simplConnector.lookupByExternalId(context(), "ERP-4711");

    expect(product?.attributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "cf-a1",
          label: "Betriebsdruck",
          value: 12.5,
          unit: "bar",
          // The asset type's JSON Schema states the type - it is not read off
          // this one value.
          valueType: "number",
        }),
        expect.objectContaining({
          key: "cf-b2",
          label: "Werkstoff",
          value: "Edelstahl",
          unit: undefined,
          valueType: "string",
        }),
      ]),
    );
    // An empty field is not a value.
    expect(product?.attributes.map((attribute) => attribute.key)).not.toContain("cf-c3");
  });

  it("takes the manufacturer's primary address, not the first one", async () => {
    const product = await simplConnector.lookupByExternalId(context(), "ERP-4711");

    expect(product?.manufacturer).toEqual({
      externalId: "org-9",
      legalName: "Muster Maschinenbau GmbH",
      roles: ["manufacturer"],
      address: {
        street: "Musterstraße",
        buildingNumber: "12a",
        postalCode: "44139",
        city: "Dortmund",
        region: undefined,
        countryCode: "DE",
      },
    });
  });

  it("lists the attached documents without fetching them", async () => {
    const product = await simplConnector.lookupByExternalId(context(), "ERP-4711");

    expect(product?.documents).toEqual([
      { externalId: "res-1", name: "Datenblatt.pdf", mimeType: "application/pdf" },
    ]);
    expect(calls.map((call) => call.url)).not.toContain("/v1/resources/res-1/file");
  });

  it("keeps a document that SIMPL lists without a name", async () => {
    // Real assets sometimes carry only an id and `isPublic` in `resources`.
    // Without a fallback the document would silently disappear, and "no
    // documents" would be an answer that is not true.
    routes = [
      json(
        "/v1/assets/ERP-4711",
        { ...ASSET, resources: [{ id: "res-9", isPublic: false }] },
        { externalId: "true" },
      ),
      json("/v1/asset-types/at-1", ASSET_TYPE),
      json("/v1/organizations/org-9", ORGANIZATION),
    ];

    const product = await simplConnector.lookupByExternalId(context(), "ERP-4711");

    expect(product?.documents).toEqual([
      { externalId: "res-9", name: "Dokument res-9", mimeType: undefined },
    ]);
  });

  it("still returns the product when the organisation record is unreachable", async () => {
    routes = [
      json("/v1/assets/ERP-4711", ASSET, { externalId: "true" }),
      json("/v1/asset-types/at-1", ASSET_TYPE),
      (url) =>
        url.pathname === "/v1/organizations/org-9" ? new Response("", { status: 500 }) : undefined,
    ];

    const product = await simplConnector.lookupByExternalId(context(), "ERP-4711");

    // Without an address, but present: the actor can be filled in later, a
    // discarded import cannot.
    expect(product?.manufacturer).toMatchObject({ externalId: "org-9", address: undefined });
  });
});

describe("the lookup cascade", () => {
  it("falls back to the internal SIMPL id when the external one is unknown", async () => {
    // Answers **only** without `?externalId=true` - this is how SIMPL behaves
    // for an identifier that only exists internally.
    routes = [
      (url) =>
        url.pathname === "/v1/assets/a-internal" && !url.searchParams.has("externalId")
          ? Response.json({ ...ASSET, externalId: null, assetType: null, manufacturer: null })
          : undefined,
    ];

    const product = await simplConnector.lookupByExternalId(context(), "a-internal");

    expect(product?.externalId).toBe("a-internal");
    expect(calls.map((call) => call.url)).toEqual([
      "/v1/assets/a-internal?externalId=true",
      "/v1/assets/a-internal",
    ]);
  });

  it("looks for a part once no asset matches", async () => {
    routes = [
      json(
        "/v1/parts/by-external-id",
        {
          id: "p-1",
          externalId: "ART-99",
          name: "Dichtring",
          article: "A-12345",
          storageLocation: "Regal 4",
        },
        { id: "ART-99" },
      ),
    ];

    const product = await simplConnector.lookupByExternalId(context(), "ART-99");

    expect(product).toMatchObject({
      externalId: "ART-99",
      name: "Dichtring",
      // The article number is a `sku`, not a model number.
      identifiers: [{ type: "sku", value: "A-12345", issuer: "simpl" }],
      attributes: [{ key: "storageLocation", label: "Lagerort", value: "Regal 4" }],
    });
  });

  it("answers nothing when neither an asset nor a part carries the identifier", async () => {
    await expect(simplConnector.lookupByExternalId(context(), "unknown")).resolves.toBeUndefined();
  });
});

describe("the connection check", () => {
  it("treats the expected 404 as success", async () => {
    await expect(simplConnector.checkConnection(context())).resolves.toBeUndefined();
    expect(calls).toHaveLength(1);
  });

  it("surfaces rejected credentials as an auth failure", async () => {
    routes = [() => new Response("", { status: 401 })];

    await expect(simplConnector.checkConnection(context())).rejects.toBeInstanceOf(
      ConnectorAuthError,
    );
  });
});

describe("what the connector can reach", () => {
  it("only ever issues GET, and only against its four paths", async () => {
    routes = [
      json("/v1/assets/ERP-4711", ASSET, { externalId: "true" }),
      json("/v1/asset-types/at-1", ASSET_TYPE),
      json("/v1/organizations/org-9", ORGANIZATION),
    ];

    await simplConnector.lookupByExternalId(context(), "ERP-4711");
    await simplConnector.checkConnection(context());

    expect(calls.every((call) => call.method === "GET")).toBe(true);
    expect([...new Set(calls.map((call) => call.url.split("?")[0]))].sort()).toEqual([
      "/v1/asset-types/at-1",
      "/v1/assets/ERP-4711",
      "/v1/assets/__dpp-connection-check",
      "/v1/organizations/org-9",
    ]);
  });
});
