import type { Connector, ExternalProduct } from "@dpp/connector-sdk";
import { simplConnector } from "@dpp/connector-simpl";
import type { ConnectorMappedField as MappedField } from "@dpp/schemas";
import { organizationConnectors } from "@dpp/db/schema";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { registerConnector, unregisterConnector } from "../src/connectors/registry.js";
import { db } from "../src/db.js";
import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";

// Connectors to external systems.
//
// The core claim of these tests is not that an import works. It is the
// guarantee that sits above everything else: **a module can never trigger a
// write action on the external system** - even if the stored credential would
// allow it. That guarantee does not depend on the customer's key; it depends
// on the shape of the HTTP client a module gets in the first place.
//
// That is why a second, deliberately malicious module sits next to the
// well-behaved one: one that tries. A test that only walks the happy path
// would never touch the actual claim.

const UPSTREAM = "https://erp.test";
const SIMPL_UPSTREAM = "https://api.simpltech.de";
const CLIENT_ID = "erp-client";
const CLIENT_SECRET = "erp-secret-value";

// What the fake external system has seen. The sharpest claim in this file is
// about this list: a forbidden path does **not** appear in it - it is not
// rejected, it is never sent.
let seen: { method: string; url: string }[] = [];
let realFetch: typeof fetch;

const configFields = [
  { key: "clientId", label: "Client ID", required: true, secret: false },
  { key: "clientSecret", label: "Client Secret", required: true, secret: true },
];

const auth = {
  kind: "client-credentials" as const,
  tokenPath: "/v1/auth",
  clientIdKey: "clientId",
  clientSecretKey: "clientSecret",
  encoding: "form" as const,
  accessTokenField: "access_token",
  expiresAtField: "expires_at",
};

const goodConnector: Connector = {
  manifest: {
    key: "test-erp",
    name: "Test ERP",
    description: "Ein erfundenes ERP für die Tests",
    version: "1.0.0",
    vendor: "Test",
    baseUrl: UPSTREAM,
    allowlist: [{ method: "GET", path: "/v1/items/{id}" }],
    auth,
    configFields,
    capabilities: ["lookupByExternalId"],
  },
  async checkConnection(context) {
    await context.http.tryGet("/v1/items/__ping");
  },
  async lookupByExternalId(context, externalId) {
    const item = await context.http.tryGet<{
      id: string;
      title: string;
      serial?: string;
      manufacturer?: { id: string; name: string };
    }>(`/v1/items/${externalId}`);
    if (!item) return undefined;

    return {
      externalId: item.id,
      name: item.title,
      identifiers: item.serial ? [{ type: "serialNumber" as const, value: item.serial }] : [],
      manufacturer: item.manufacturer
        ? {
            externalId: item.manufacturer.id,
            legalName: item.manufacturer.name,
            roles: ["manufacturer" as const],
          }
        : undefined,
      attributes: [{ key: "colour", label: "Farbe", value: "grün" }],
      documents: [],
    } satisfies ExternalProduct;
  },
};

// Same manifest, but the call reaches past it: `/v1/items/{id}/delete` is on
// no allowlist. This is exactly the case that must not get through.
const rogueConnector: Connector = {
  ...goodConnector,
  manifest: { ...goodConnector.manifest, key: "test-rogue", name: "Rogue ERP" },
  async lookupByExternalId(context, externalId) {
    await context.http.get(`/v1/items/${externalId}/delete`);

    return undefined;
  },
};

// The fake SIMPL system. Only as much as the shipped module queries on the
// happy path - anything beyond that would arrive here as an unanswered path
// and fail the test.
function fakeSimpl(url: URL, method: string): Promise<Response> | undefined {
  if (url.pathname === "/v1/auth" && method === "POST") {
    return Promise.resolve(
      Response.json({
        access_token: "simpl-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
  }
  if (url.pathname === "/v1/assets/ERP-4711" && url.searchParams.get("externalId") === "true") {
    return Promise.resolve(
      Response.json({
        id: "a-internal",
        externalId: "ERP-4711",
        title: "Hochdruckaggregat",
        serialNumber: "SN-4711",
        assetType: { id: "at-1", title: "Hochdruckaggregate" },
        manufacturer: { id: "org-9", title: "Muster Maschinenbau GmbH", type: "MANUFACTURER" },
        customFields: { "cf-a1": 12.5 },
        resources: [
          { id: "res-1", name: "Datenblatt.pdf", type: "application/pdf", isPublic: true },
        ],
        updatedAt: "2026-07-01T10:00:00Z",
      }),
    );
  }
  if (url.pathname === "/v1/asset-types/at-1") {
    return Promise.resolve(
      Response.json({
        id: "at-1",
        title: "Hochdruckaggregate",
        customFields: { properties: { "cf-a1": { title: "Betriebsdruck", unit: "bar" } } },
      }),
    );
  }
  if (url.pathname === "/v1/resources/res-1/file") {
    // A tiny, valid PDF: the platform checks the byte signature against the
    // declared content type, so a fabricated body would not pass.
    return Promise.resolve(
      new Response(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2]),
        {
          headers: { "content-type": "application/pdf" },
        },
      ),
    );
  }
  if (url.pathname === "/v1/organizations/org-9") {
    return Promise.resolve(
      Response.json({
        id: "org-9",
        title: "Muster Maschinenbau GmbH",
        type: "MANUFACTURER",
        locations: [{ city: "Dortmund", country: "DE", isPrimary: true, postal: "44139" }],
      }),
    );
  }

  return Promise.resolve(new Response("", { status: 404 }));
}

function fakeUpstream(input: RequestInfo | URL, init?: RequestInit): Promise<Response> | undefined {
  const url = input instanceof URL ? input : new URL(String(input));
  const method = init?.method ?? "GET";

  if (url.origin === SIMPL_UPSTREAM) {
    seen.push({ method, url: url.pathname });
    return fakeSimpl(url, method);
  }
  if (url.origin !== UPSTREAM) return undefined;

  seen.push({ method, url: url.pathname });

  if (url.pathname === "/v1/auth" && method === "POST") {
    return Promise.resolve(
      Response.json({ access_token: "token-1", expires_at: Math.floor(Date.now() / 1000) + 3600 }),
    );
  }
  if (url.pathname === "/v1/items/item-1") {
    return Promise.resolve(
      Response.json({
        id: "item-1",
        title: "Hochdruckaggregat",
        serial: "SN-4711",
        manufacturer: { id: "org-9", name: "Muster Maschinenbau GmbH" },
      }),
    );
  }

  return Promise.resolve(new Response("", { status: 404 }));
}

beforeAll(() => {
  registerConnector(goodConnector);
  registerConnector(rogueConnector);

  realFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    fakeUpstream(input, init) ?? realFetch(input, init)) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
  unregisterConnector(goodConnector.manifest.key);
  unregisterConnector(rogueConnector.manifest.key);
});

// The shipped SIMPL module under a different key: the same lookup against
// the same fake external system, so a test only changes what it actually
// checks.
function simplLike(key = "doc-liar"): Connector {
  return {
    ...simplConnector,
    manifest: { ...simplConnector.manifest, key, name: `SIMPL (${key})` },
  };
}

type Catalog = {
  connectors: {
    configFields: { key: string; secret: boolean }[];
    hasCredentials: boolean;
    installed: boolean;
    key: string;
    status: string | null;
  }[];
};

async function install(client: TestClient, key = "test-erp") {
  return client.put(`/v1/connectors/${key}`, {
    values: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET },
  });
}

describe("connector installation", () => {
  let organization: OrganizationFixture;

  beforeAll(async () => {
    organization = await createOrganization("connectors");
  });

  it("lists the shipped modules as not installed", async () => {
    const response = await organization.admin.get<Catalog>("/v1/connectors");

    expect(response.status).toBe(200);
    const entry = response.body.connectors.find((c) => c.key === "test-erp");
    expect(entry).toMatchObject({ installed: false, status: null, hasCredentials: false });
    expect(entry?.configFields.find((field) => field.key === "clientSecret")?.secret).toBe(true);
  });

  it("refuses an installation that leaves a required field empty", async () => {
    const response = await organization.admin.put("/v1/connectors/test-erp", {
      values: { clientId: CLIENT_ID },
    });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      messages: [{ code: "CONNECTOR_CONFIG_INCOMPLETE" }],
    });
  });

  it("rejects an unknown module rather than storing credentials for nothing", async () => {
    const response = await organization.admin.put("/v1/connectors/not-a-module", {
      values: { clientId: "x" },
    });

    expect(response.status).toBe(404);
  });

  it("installs and never shows the secret again", async () => {
    expect((await install(organization.admin)).status).toBe(200);

    const listed = await organization.admin.get<Catalog>("/v1/connectors");
    const entry = listed.body.connectors.find((c) => c.key === "test-erp");
    expect(entry).toMatchObject({ installed: true, status: "active", hasCredentials: true });
    // The plaintext must not appear in any response - not even hidden inside
    // the open configuration.
    expect(JSON.stringify(listed.body)).not.toContain(CLIENT_SECRET);
  });

  it("stores the credentials encrypted, not as readable text", async () => {
    const [row] = await db
      .select({
        config: organizationConnectors.config,
        credentials: organizationConnectors.credentials,
      })
      .from(organizationConnectors)
      .where(
        and(
          eq(organizationConnectors.organizationId, organization.id),
          eq(organizationConnectors.connectorKey, "test-erp"),
        ),
      );

    expect(row?.credentials).toBeTruthy();
    expect(row?.credentials).not.toContain(CLIENT_SECRET);
    expect(row?.credentials?.startsWith("v1.")).toBe(true);
    // The open configuration carries only the non-secret fields.
    expect(row?.config).toEqual({ clientId: CLIENT_ID });
  });

  it("keeps the stored secret when the form leaves it blank", async () => {
    const response = await organization.admin.put("/v1/connectors/test-erp", {
      values: { clientId: "erp-client-2" },
    });

    expect(response.status).toBe(200);
    const test = await organization.admin.post("/v1/connectors/test-erp/test");
    // The connection test only succeeds if the secret is still there.
    expect(test.status).toBe(200);

    await install(organization.admin);
  });
});

describe("using an installed connector", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;

  beforeAll(async () => {
    organization = await createOrganization("connector-use");
    editor = await addMember(organization, "editor");
    await install(organization.admin);
    seen = [];
  });

  it("looks a product up and returns it normalised", async () => {
    const response = await organization.admin.get<{ product: ExternalProduct }>(
      "/v1/connectors/test-erp/products/item-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.product).toMatchObject({
      externalId: "item-1",
      name: "Hochdruckaggregat",
      identifiers: [{ type: "serialNumber", value: "SN-4711" }],
      manufacturer: { externalId: "org-9", legalName: "Muster Maschinenbau GmbH" },
    });
  });

  it("exchanges the token once and reuses it across requests", async () => {
    // A dedicated organization so the login path starts cold here - otherwise
    // the result would depend on which test ran before it.
    const fresh = await createOrganization("connector-token");
    await install(fresh.admin);
    seen = [];

    await fresh.admin.get("/v1/connectors/test-erp/products/item-1");
    await fresh.admin.get("/v1/connectors/test-erp/products/item-1");
    await fresh.admin.get("/v1/connectors/test-erp/products/item-1");

    // Three lookups, **one** login. Logging in on every incoming request would
    // burn through the upstream's quota for a token that stays valid for hours.
    expect(seen.filter((call) => call.url === "/v1/auth")).toHaveLength(1);
    expect(seen.filter((call) => call.method === "GET")).toHaveLength(3);
  });

  it("answers a missing identifier with 404 instead of an empty product", async () => {
    const response = await organization.admin.get("/v1/connectors/test-erp/products/nope");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      messages: [{ code: "EXTERNAL_PRODUCT_NOT_FOUND" }],
    });
  });

  it("imports the product into the catalogue and creates its manufacturer", async () => {
    const imported = await organization.admin.post<{
      product: { created: boolean; productId: string };
    }>("/v1/connectors/test-erp/import", { externalId: "item-1" });

    expect(imported.status).toBe(201);
    expect(imported.body.product).toMatchObject({ created: true, productId: "item-1" });

    const product = await organization.admin.get<{
      product: { identifiers: { identifierValue: string }[]; metadata: Record<string, unknown> };
    }>("/v1/products/item-1");
    expect(product.status).toBe(200);
    expect(product.body.product.identifiers).toEqual([
      expect.objectContaining({ identifierValue: "SN-4711" }),
    ]);
    // The provenance stays attached to the product.
    expect(product.body.product.metadata).toMatchObject({
      source: { connector: "test-erp", externalId: "item-1" },
    });

    const operator = await organization.admin.get("/v1/economic-operators/org-9");
    expect(operator.status).toBe(200);
  });

  it("refreshes instead of creating a second product on re-import", async () => {
    const again = await organization.admin.post<{ product: { created: boolean } }>(
      "/v1/connectors/test-erp/import",
      { externalId: "item-1" },
    );

    expect(again.status).toBe(200);
    expect(again.body.product.created).toBe(false);

    const products = await organization.admin.get<{ products: { productId: string }[] }>(
      "/v1/products",
    );
    expect(products.body.products.filter((p) => p.productId === "item-1")).toHaveLength(1);
  });

  it("lets an editor import but keeps management to admins", async () => {
    expect((await editor.get("/v1/connectors/test-erp/products/item-1")).status).toBe(200);
    expect((await editor.get("/v1/connectors")).status).toBe(403);
    expect((await editor.put("/v1/connectors/test-erp", { values: {} })).status).toBe(403);
  });

  it("refuses every call once the connector is switched off", async () => {
    await organization.admin.put("/v1/connectors/test-erp/status", { status: "disabled" });

    const response = await organization.admin.get("/v1/connectors/test-erp/products/item-1");
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ messages: [{ code: "CONNECTOR_DISABLED" }] });

    await organization.admin.put("/v1/connectors/test-erp/status", { status: "active" });
  });
});

describe("the read-only guarantee", () => {
  let organization: OrganizationFixture;

  beforeAll(async () => {
    organization = await createOrganization("connector-rogue");
    await install(organization.admin, "test-rogue");
    seen = [];
  });

  it("never sends a call the module is not allowed to make", async () => {
    const response = await organization.admin.get("/v1/connectors/test-rogue/products/item-1");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      messages: [{ code: "CONNECTOR_ROUTE_FORBIDDEN" }],
    });

    // The actual claim: the external system never saw the call. A rejection
    // that only happens once it arrives there would be no rejection at all.
    expect(seen.map((call) => call.url)).not.toContain("/v1/items/item-1/delete");
  });

  it("has no way to reach an endpoint outside the module's allowlist", async () => {
    seen = [];
    await organization.admin.get("/v1/connectors/test-rogue/products/item-1");

    // At most the login remains - the only call the platform itself makes,
    // and the only one that is not GET.
    expect(seen.every((call) => call.url === "/v1/auth" || call.method === "GET")).toBe(true);
  });
});

// Everything up to here ran against fake modules. This section takes the
// **shipped** SIMPL module and sends it through the same routes: real
// manifest, real allowlist, real login, real mapping.
describe("the shipped SIMPL connector", () => {
  let organization: OrganizationFixture;

  beforeAll(async () => {
    organization = await createOrganization("connector-simpl");
    seen = [];
  });

  it("is offered by this installation", async () => {
    const response = await organization.admin.get<Catalog>("/v1/connectors");
    const entry = response.body.connectors.find((c) => c.key === "simpl");

    expect(entry).toMatchObject({ installed: false });
    expect(entry?.configFields.map((field) => field.key)).toEqual(["clientId", "clientSecret"]);
    expect(entry?.configFields.find((field) => field.key === "clientSecret")?.secret).toBe(true);
  });

  it("looks an asset up and imports it, resolving type and manufacturer on the way", async () => {
    const installed = await organization.admin.put("/v1/connectors/simpl", {
      values: { clientId: "simpl-client", clientSecret: "simpl-secret" },
    });
    expect(installed.status).toBe(200);

    const looked = await organization.admin.get<{ product: Record<string, unknown> }>(
      "/v1/connectors/simpl/products/ERP-4711",
    );
    expect(looked.status).toBe(200);
    expect(looked.body.product).toMatchObject({
      externalId: "ERP-4711",
      name: "Hochdruckaggregat",
      category: "Hochdruckaggregate",
      identifiers: [{ type: "serialNumber", value: "SN-4711", issuer: "simpl" }],
      // The generated field key was resolved via the asset type.
      attributes: [{ key: "cf-a1", label: "Betriebsdruck", value: 12.5, unit: "bar" }],
      manufacturer: {
        externalId: "org-9",
        legalName: "Muster Maschinenbau GmbH",
        address: { city: "Dortmund", countryCode: "DE", postalCode: "44139" },
      },
    });

    const imported = await organization.admin.post<{ product: { productId: string } }>(
      "/v1/connectors/simpl/import",
      { externalId: "ERP-4711" },
    );
    expect(imported.status).toBe(201);
    expect(imported.body.product.productId).toBe("ERP-4711");

    const operator = await organization.admin.get<{
      economicOperator: { countryCode: string | null; legalName: string };
    }>("/v1/economic-operators/org-9");
    expect(operator.status).toBe(200);
    expect(operator.body.economicOperator).toMatchObject({
      legalName: "Muster Maschinenbau GmbH",
      countryCode: "DE",
    });
  });

  it("touched nothing but its four declared paths, and only with GET", async () => {
    const paths = [
      ...new Set(seen.filter((call) => call.method === "GET").map((call) => call.url)),
    ];

    expect(paths.sort()).toEqual([
      "/v1/asset-types/at-1",
      "/v1/assets/ERP-4711",
      "/v1/organizations/org-9",
    ]);
    // The only non-GET call in the whole traffic is the login, and the
    // platform makes it, not the module.
    expect(seen.filter((call) => call.method !== "GET")).toEqual([
      { method: "POST", url: "/v1/auth" },
    ]);
  });
});

// Field mapping is a matter of the framework, not the module - it is still
// tested here against the shipped module, because only there does everything
// it must handle come together: a record type, generated field keys, and a
// passport that ultimately runs through the same checks as a hand-created one.
describe("deciding where the fields go", () => {
  let organization: OrganizationFixture;

  beforeAll(async () => {
    organization = await createOrganization("connector-mapping");
    await organization.admin.put("/v1/connectors/simpl", {
      values: { clientId: "simpl-client", clientSecret: "simpl-secret" },
    });
  });

  it("proposes the matching dictionary entry instead of making the user hunt for it", async () => {
    await organization.admin.post("/v1/data-dictionary-repositories", {
      repositoryKey: "mapping-dict",
      name: { de: "Zuordnungswörterbuch" },
      namespaceUri: "https://dictionary.test/mapping/2026.1/",
      version: "2026.1",
      status: "active",
    });
    await organization.admin.post("/v1/data-dictionary-repositories/mapping-dict/entries", {
      entryKey: "operatingPressure",
      // Same name as the asset's custom field - exactly the case a
      // suggestion is meant to take off the user's hands.
      name: { de: "Betriebsdruck" },
      unit: "bar",
      valueType: "number",
      visibility: "public",
      required: false,
    });

    const preview = await organization.admin.get<{ mapping: { fields: MappedField[] } }>(
      "/v1/connectors/simpl/products/ERP-4711",
    );

    expect(preview.body.mapping.fields[0]?.suggestion).toMatchObject({
      label: "Betriebsdruck",
      visibility: "public",
      confidence: 1,
    });
    // Suggested, not applied: the decision stays with the user.
    expect(preview.body.mapping.fields[0]?.target).toBe("attribute");
    expect(preview.body.mapping.fields[0]?.dictionaryReference).toBeFalsy();
  });

  it("offers every source field, undecided, under the record's own type", async () => {
    const preview = await organization.admin.get<{
      mapping: { fields: MappedField[]; sourceType: { key: string; label: string } };
    }>("/v1/connectors/simpl/products/ERP-4711");

    expect(preview.status).toBe(200);
    // The asset type is what the mapping is keyed on.
    expect(preview.body.mapping.sourceType).toEqual({
      key: "asset:at-1",
      label: "Hochdruckaggregate",
    });
    expect(preview.body.mapping.fields).toContainEqual(
      expect.objectContaining({
        sourceField: "cf-a1",
        label: "Betriebsdruck",
        value: 12.5,
        unit: "bar",
        // Default: carry along, do not interpret.
        target: "attribute",
        configured: false,
      }),
    );
  });

  it("turns a field into a passport element in the collection it was assigned to", async () => {
    const imported = await organization.admin.post<{
      product: { dpp: { publicId: string } | null; dppError: unknown; productId: string };
    }>("/v1/connectors/simpl/import", {
      externalId: "ERP-4711",
      fields: [
        {
          sourceField: "cf-a1",
          target: "element",
          dictionaryReference: "urn:test:operatingPressure",
          elementId: "operatingPressure",
          collectionElementId: "technicalData",
          collectionName: "Technische Daten",
          visibility: "public",
          unit: "bar",
        },
      ],
      dpp: {
        granularity: "item",
        dppSchemaVersion: "test-dictionary/2026.1",
        // The import itself created the manufacturer.
        economicOperatorId: "org-9",
      },
    });

    expect(imported.status).toBe(201);
    expect(imported.body.product.dppError).toBeFalsy();
    expect(imported.body.product.dpp?.publicId).toBeTruthy();

    const dpp = await organization.admin.get<{
      dpp: {
        collections: {
          dataElements: { elementId: string; value: unknown; visibility: string }[];
          elementId: string;
        }[];
      };
    }>(`/v1/dpps/${imported.body.product.dpp?.publicId}`);
    expect(dpp.status).toBe(200);

    const collection = dpp.body.dpp.collections.find((c) => c.elementId === "technicalData");
    expect(collection?.dataElements).toEqual([
      expect.objectContaining({
        elementId: "operatingPressure",
        value: 12.5,
        visibility: "public",
      }),
    ]);

    // What went into the passport is not also kept as provenance on the
    // product - otherwise the same value would live in two places and the
    // two could drift apart.
    const productRecord = await organization.admin.get<{
      product: { metadata: { source: { attributes: { key: string }[] } } };
    }>("/v1/products/ERP-4711");
    // The document field still lives there as provenance - what is checked
    // is that the mapped value is **not** kept twice.
    expect(
      productRecord.body.product.metadata.source.attributes.map((attribute) => attribute.key),
    ).not.toContain("cf-a1");
  });

  it("remembers the decision for the next record of the same type", async () => {
    const preview = await organization.admin.get<{ mapping: { fields: MappedField[] } }>(
      "/v1/connectors/simpl/products/ERP-4711",
    );

    expect(preview.body.mapping.fields[0]).toMatchObject({
      sourceField: "cf-a1",
      target: "element",
      dictionaryReference: "urn:test:operatingPressure",
      collectionElementId: "technicalData",
      configured: true,
    });
  });

  it("drops a field that was marked as not wanted", async () => {
    await organization.admin.put("/v1/connectors/simpl/mappings", {
      sourceType: "asset:at-1",
      fields: [{ sourceField: "cf-a1", target: "ignore", visibility: "controlled" }],
    });

    await organization.admin.post("/v1/connectors/simpl/import", { externalId: "ERP-4711" });

    const productRecord = await organization.admin.get<{
      product: { metadata: { source: { attributes: { key: string }[] } } };
    }>("/v1/products/ERP-4711");
    // The document field still lives there as provenance - what is checked
    // is that the mapped value is **not** kept twice.
    expect(
      productRecord.body.product.metadata.source.attributes.map((attribute) => attribute.key),
    ).not.toContain("cf-a1");
  });

  it("keeps the catalogue entry when the passport is rejected, and says why", async () => {
    const imported = await organization.admin.post<{
      product: { dpp: unknown; dppError: { code: string } | null; productId: string };
    }>("/v1/connectors/simpl/import", {
      externalId: "ERP-4711",
      dpp: {
        granularity: "item",
        dppSchemaVersion: "test-dictionary/2026.1",
        economicOperatorId: "does-not-exist",
      },
    });

    // The catalogue entry is correct on its own - rolling it back because the
    // passport failed on a missing reference would be a second disappointment.
    expect(imported.status).toBe(200);
    expect(imported.body.product.productId).toBe("ERP-4711");
    expect(imported.body.product.dpp).toBeFalsy();
    expect(imported.body.product.dppError?.code).toBe("DPP_REFERENCE_NOT_FOUND");
  });

  it("does not let an import write mappings for fields the record does not have", async () => {
    await organization.admin.post("/v1/connectors/simpl/import", {
      externalId: "ERP-4711",
      fields: [
        { sourceField: "cf-a1", target: "attribute", visibility: "controlled" },
        { sourceField: "invented", target: "element", visibility: "public" },
      ],
    });

    const profile = await organization.admin.get<{
      mapping: { fields: { sourceField: string }[] };
    }>("/v1/connectors/simpl/mappings?sourceType=asset:at-1");
    const stored = profile.body.mapping.fields.map((field) => field.sourceField);
    expect(stored).not.toContain("invented");
    expect(stored).toContain("cf-a1");
  });
});

// Documents are the only part of the mapping that fetches something rather
// than just classifying it. Hence a run through the whole path here: decision,
// download through the read-only client, blob storage with all its checks,
// data element.
// The first import of a record kind has nothing to map onto: the dictionary is
// empty, and every field falls back to a provenance attribute. What the source
// system does carry is a field schema - and reading that as a vocabulary
// proposal is the difference between "build one by hand first" and "confirm
// this one".
describe("drafting a dictionary from a record kind", () => {
  let organization: OrganizationFixture;

  type Draft = {
    dictionaryDraft: {
      entries: {
        entryKey: string;
        existing: unknown;
        inferredValueType: boolean;
        sourceField: string;
        valueType: string;
        visibility: string;
      }[];
      repository: { name: string; namespaceUri: string; repositoryKey: string; version: string };
    };
  };

  type Placement = {
    collection: { id: string; label: string } | null;
    dictionaryReference: string;
    entryKey: string;
    sourceField: string;
  };

  type Created = {
    dictionary: {
      created: Placement[];
      existing: Placement[];
      repositoryKey: string;
      repositoryVersion: string;
    };
  };

  beforeAll(async () => {
    organization = await createOrganization("connector-draft");
    await organization.admin.put("/v1/connectors/simpl", {
      values: { clientId: "simpl-client", clientSecret: "simpl-secret" },
    });
  });

  it("comes with the preview, keyed on the record kind", async () => {
    const preview = await organization.admin.get<Draft>("/v1/connectors/simpl/products/ERP-4711");

    expect(preview.status).toBe(200);
    expect(preview.body.dictionaryDraft.repository).toMatchObject({
      name: "Hochdruckaggregate (SIMPL)",
      repositoryKey: "simpl-hochdruckaggregate",
    });

    const pressure = preview.body.dictionaryDraft.entries.find(
      (entry) => entry.sourceField === "cf-a1",
    );
    expect(pressure).toMatchObject({
      entryKey: "betriebsdruck",
      // This asset type states no type for the field, so the type was read off
      // the value - and the draft says so rather than passing it off as known.
      inferredValueType: true,
      valueType: "number",
      // Nothing is proposed as public: what is disclosed is a disclosure
      // decision, not a default.
      visibility: "controlled",
    });
  });

  it("creates the dictionary and hands back the reference per source field", async () => {
    const preview = await organization.admin.get<Draft>("/v1/connectors/simpl/products/ERP-4711");
    const { repository } = preview.body.dictionaryDraft;

    const created = await organization.admin.post<Created>("/v1/connectors/simpl/dictionary", {
      entries: preview.body.dictionaryDraft.entries.map((entry) => ({
        entryKey: entry.entryKey,
        name: entry.entryKey,
        required: false,
        sourceField: entry.sourceField,
        valueType: entry.valueType,
        visibility: entry.visibility,
      })),
      sourceType: { key: "asset:at-1", label: "Hochdruckaggregate" },
      target: { mode: "new", ...repository },
    });

    expect(created.status).toBe(201);
    expect(created.body.dictionary.repositoryKey).toBe("simpl-hochdruckaggregate");
    // The reference hangs off the namespace of the version actually written to.
    expect(
      created.body.dictionary.created.find((entry) => entry.sourceField === "cf-a1")
        ?.dictionaryReference,
    ).toBe(`${repository.namespaceUri}betriebsdruck`);
    // No category unless one was asked for. The import used to invent one from
    // the record kind, which sorted the vocabulary by the source system's axis
    // instead of by subject - and named the passport's collection after an
    // asset type. Without one the entries land in the catalogue's default
    // group, where someone can file them.
    expect(
      created.body.dictionary.created.find((entry) => entry.sourceField === "cf-a1")?.collection,
    ).toBeNull();

    const entries = await organization.admin.get<{ entries: { entryKey: string }[] }>(
      "/v1/data-dictionary-repositories/simpl-hochdruckaggregate/entries",
    );
    expect(entries.body.entries.map((entry) => entry.entryKey)).toContain("betriebsdruck");
  });

  it("no longer proposes what the dictionary meanwhile holds", async () => {
    const preview = await organization.admin.get<Draft>("/v1/connectors/simpl/products/ERP-4711");

    // Still in the draft, but marked - filtering it out would decide for the
    // user that the existing entry is the right one; creating it anyway would
    // turn one vocabulary into two.
    expect(
      preview.body.dictionaryDraft.entries.find((entry) => entry.sourceField === "cf-a1")?.existing,
    ).toMatchObject({ label: "betriebsdruck" });
  });

  it("refuses to quietly write into a dictionary that already exists", async () => {
    const conflict = await organization.admin.post("/v1/connectors/simpl/dictionary", {
      entries: [
        {
          entryKey: "irgendwas",
          name: "Irgendwas",
          sourceField: "cf-a1",
          valueType: "string",
          visibility: "controlled",
        },
      ],
      sourceType: { key: "asset:at-1", label: "Hochdruckaggregate" },
      target: {
        mode: "new",
        name: "Zweiter Versuch",
        namespaceUri: "https://dictionary.test/zweiter/2026.1/",
        repositoryKey: "simpl-hochdruckaggregate",
        version: "2026.1",
      },
    });

    expect(conflict.status).toBe(409);
  });

  it("hands back a usable reference for a key the dictionary already holds", async () => {
    // The case that broke: someone builds the dictionary once, imports the next
    // record of the same kind, and picks the dictionary they just made. Every
    // key is taken, nothing is created - and if that answer carries no
    // references, the mapping is left with nothing to point at and every field
    // falls back to a provenance attribute.
    const again = await organization.admin.post<Created>("/v1/connectors/simpl/dictionary", {
      entries: [
        {
          entryKey: "betriebsdruck",
          name: "Betriebsdruck",
          sourceField: "cf-a1",
          valueType: "number",
          visibility: "controlled",
        },
        {
          entryKey: "werkstoff",
          name: "Werkstoff",
          sourceField: "cf-b2",
          valueType: "string",
          visibility: "controlled",
        },
      ],
      sourceType: { key: "asset:at-1", label: "Hochdruckaggregate" },
      target: { mode: "existing", repositoryKey: "simpl-hochdruckaggregate" },
    });

    expect(again.status).toBe(201);
    expect(again.body.dictionary.created.map((entry) => entry.entryKey)).toEqual(["werkstoff"]);

    const held = again.body.dictionary.existing.find((entry) => entry.sourceField === "cf-a1");
    expect(held).toMatchObject({ entryKey: "betriebsdruck" });
    // The same reference the first run handed out - it points into that
    // dictionary version at that key - and the category of the entry that is
    // actually there.
    expect(held?.dictionaryReference).toMatch(/simpl-hochdruckaggregate\/2026\.1\/betriebsdruck$/);
    expect(held?.collection).toBeNull();
  });

  it("files the entries under a category when one is named", async () => {
    const created = await organization.admin.post<Created>("/v1/connectors/simpl/dictionary", {
      category: { id: "technical", label: "Technische Daten" },
      entries: [
        {
          entryKey: "mit-kategorie",
          name: "Mit Kategorie",
          sourceField: "cf-a1",
          valueType: "string",
          visibility: "controlled",
        },
      ],
      sourceType: { key: "asset:at-1", label: "Hochdruckaggregate" },
      target: { mode: "existing", repositoryKey: "simpl-hochdruckaggregate" },
    });

    expect(created.status).toBe(201);
    // The same category then places the element in the passport, which is the
    // only reason the mapping needs to hear about it at all.
    expect(created.body.dictionary.created[0]?.collection).toEqual({
      id: "technical",
      label: "Technische Daten",
    });
  });

  it("places an element under the category of the entry that exists", async () => {
    // A hand-made entry outside any record kind: the import must not file the
    // element under a heading named after the asset type just because that is
    // what this request proposed.
    await organization.admin.post(
      "/v1/data-dictionary-repositories/simpl-hochdruckaggregate/entries",
      {
        entryKey: "von-hand",
        name: { de: "Von Hand" },
        valueType: "string",
        visibility: "controlled",
        required: false,
      },
    );

    const again = await organization.admin.post<Created>("/v1/connectors/simpl/dictionary", {
      entries: [
        {
          entryKey: "von-hand",
          name: "Von Hand",
          sourceField: "cf-a1",
          valueType: "string",
          visibility: "controlled",
        },
      ],
      sourceType: { key: "asset:at-1", label: "Hochdruckaggregate" },
      target: { mode: "existing", repositoryKey: "simpl-hochdruckaggregate" },
    });

    expect(again.status).toBe(201);
    expect(again.body.dictionary.existing[0]).toMatchObject({
      collection: null,
      entryKey: "von-hand",
    });
  });

  it("is catalogue work, not administration - an editor may do it", async () => {
    const editor = await addMember(organization, "editor");
    const response = await editor.post("/v1/connectors/simpl/dictionary", {
      entries: [
        {
          entryKey: "vom-editor",
          name: "Vom Editor",
          sourceField: "cf-a1",
          valueType: "string",
          visibility: "controlled",
        },
      ],
      sourceType: { key: "asset:at-1", label: "Hochdruckaggregate" },
      target: { mode: "existing", repositoryKey: "simpl-hochdruckaggregate" },
    });

    expect(response.status).toBe(201);
  });
});

describe("documents from the connected system", () => {
  let organization: OrganizationFixture;

  beforeAll(async () => {
    organization = await createOrganization("connector-docs");
    await organization.admin.put("/v1/connectors/simpl", {
      values: { clientId: "simpl-client", clientSecret: "simpl-secret" },
    });
  });

  it("offers the record's documents as one decision, defaulting to not fetching them", async () => {
    const preview = await organization.admin.get<{ mapping: { fields: MappedField[] } }>(
      "/v1/connectors/simpl/products/ERP-4711",
    );

    const documents = preview.body.mapping.fields.find(
      (field) => field.sourceField === "__documents",
    );
    expect(documents).toMatchObject({
      label: "Dokumente (1)",
      target: "attribute",
      value: ["Datenblatt.pdf"],
    });
  });

  it("does not fetch a single byte while nobody has asked for the files", async () => {
    seen = [];
    await organization.admin.post("/v1/connectors/simpl/import", { externalId: "ERP-4711" });

    // Downloading what nobody wants burns the upstream's quota and our own
    // storage.
    expect(seen.map((call) => call.url)).not.toContain("/v1/resources/res-1/file");
  });

  it("fetches, stores and links the file once it belongs in the passport", async () => {
    const imported = await organization.admin.post<{
      product: { dpp: { publicId: string } | null; skippedDocuments: unknown[] };
    }>("/v1/connectors/simpl/import", {
      externalId: "ERP-4711",
      fields: [
        {
          sourceField: "__documents",
          target: "element",
          dictionaryReference: "urn:test:datasheet",
          collectionElementId: "documents",
          collectionName: "Dokumente",
          visibility: "public",
        },
      ],
      dpp: {
        granularity: "item",
        dppSchemaVersion: "test-dictionary/2026.1",
        economicOperatorId: "org-9",
      },
    });

    expect(imported.body.product.skippedDocuments).toEqual([]);
    expect(imported.body.product.dpp?.publicId).toBeTruthy();

    const dpp = await organization.admin.get<{
      dpp: {
        collections: {
          dataElements: {
            blobObjectId?: string;
            contentType?: string;
            elementId: string;
            filename?: string;
            kind: string;
          }[];
          elementId: string;
        }[];
      };
    }>(`/v1/dpps/${imported.body.product.dpp?.publicId}`);

    const element = dpp.body.dpp.collections
      .find((collection) => collection.elementId === "documents")
      ?.dataElements.find((entry) => entry.kind === "document");
    expect(element).toMatchObject({
      elementId: "document-res-1",
      filename: "Datenblatt.pdf",
      contentType: "application/pdf",
    });

    // The bytes really live in blob storage - the passport does not point
    // into thin air.
    const blob = await organization.admin.get<{ result: { filename: string; size: number } }>(
      `/v1/documents/${element?.blobObjectId}`,
    );
    expect(blob.status).toBe(200);
    expect(blob.body.result).toMatchObject({ filename: "Datenblatt.pdf" });
  });

  it("puts the file through the same barriers as a browser upload", async () => {
    // A module that reports an executable file as a PDF: the check sits on
    // the bytes, not on the external system's claim.
    const rejecting: Connector = {
      ...simplLike(),
      async downloadDocument() {
        return {
          body: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]).buffer,
          mimeType: "application/pdf",
        };
      },
    };
    registerConnector(rejecting);
    await organization.admin.put("/v1/connectors/doc-liar", {
      values: { clientId: "c", clientSecret: "s" },
    });

    const imported = await organization.admin.post<{
      product: { skippedDocuments: { name: string; reason: string }[] };
    }>("/v1/connectors/doc-liar/import", {
      externalId: "ERP-4711",
      fields: [
        {
          sourceField: "__documents",
          target: "element",
          dictionaryReference: "urn:test:datasheet",
          visibility: "controlled",
        },
      ],
    });

    // The catalogue entry stands; the file does not, and the reason is
    // attached. 200 instead of 201: the product already exists from earlier
    // tests.
    expect(imported.status).toBe(200);
    expect(imported.body.product.skippedDocuments).toHaveLength(1);
    expect(imported.body.product.skippedDocuments[0]?.name).toBe("Datenblatt.pdf");

    unregisterConnector("doc-liar");
  });
});

describe("removal", () => {
  it("deletes the installation together with its credentials", async () => {
    const organization = await createOrganization("connector-remove");
    await install(organization.admin);

    const removed = await organization.admin.delete("/v1/connectors/test-erp");
    expect(removed.status).toBe(200);

    const rows = await db
      .select({ id: organizationConnectors.id })
      .from(organizationConnectors)
      .where(eq(organizationConnectors.organizationId, organization.id));
    expect(rows).toHaveLength(0);

    expect((await organization.admin.delete("/v1/connectors/test-erp")).status).toBe(404);
  });
});
