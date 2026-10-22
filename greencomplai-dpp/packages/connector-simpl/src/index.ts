import type {
  AllowedRoute,
  Connector,
  ConnectorContext,
  ExternalProduct,
} from "@dpp/connector-sdk";

import type { SimplAsset, SimplAssetType, SimplOrganization, SimplPart } from "./api-types.js";
import { assetToProduct, partToProduct } from "./mapping.js";

// The connector to SIMPL (api.simpltech.de).
//
// SIMPL is an asset and service platform, not an article master. Two things matter for the
// passport: an **asset** is a single physical object with a serial number, manufacturer, and
// custom fields - the natural candidate for a unit-level passport. A **part** is the catalog
// entry with an article number.
//
// The module depends on nothing but the SDK. It knows neither the platform's database nor its
// HTTP server, and has no way out besides the read-only client it's handed.

export const SIMPL_BASE_URL = "https://api.simpltech.de";

// What the module may call - and nothing else.
//
// Four paths, because four paths are called. The list is deliberately not "everything that
// looks like a read": an endpoint nobody needs is an allowance without benefit. Of the spec's
// 66 operations, 36 are writes; none of them is reachable from here, and even the remaining 30
// read operations only insofar as they're listed here.
//
// `/v1/assets/{id}` covers both lookup paths: with `?externalId=true` the external system's
// identifier, without it the internal SIMPL identifier.
export const SIMPL_ALLOWLIST: AllowedRoute[] = [
  { method: "GET", path: "/v1/assets/{id}" },
  { method: "GET", path: "/v1/asset-types/{id}" },
  { method: "GET", path: "/v1/parts/by-external-id" },
  { method: "GET", path: "/v1/organizations/{id}" },
  // Only allowed since something actually downloads it. Allowing it speculatively would have
  // been an allowance without benefit.
  { method: "GET", path: "/v1/resources/{id}/file" },
];

export const simplConnector: Connector = {
  manifest: {
    key: "simpl",
    name: "SIMPL",
    description:
      "Anlagen und Artikel aus SIMPL (api.simpltech.de) in den Produktkatalog übernehmen. Nur lesend.",
    version: "1.0.0",
    vendor: "SIMPL Technologies GmbH",
    baseUrl: SIMPL_BASE_URL,
    allowlist: SIMPL_ALLOWLIST,
    // SIMPL exchanges credentials for a token valid for 24 hours via POST. Described here so
    // the platform executes that POST, not the module - otherwise the allowlist above would be
    // nothing more than a request.
    auth: {
      kind: "client-credentials",
      tokenPath: "/v1/auth",
      clientIdKey: "clientId",
      clientSecretKey: "clientSecret",
      encoding: "form",
      accessTokenField: "access_token",
      expiresAtField: "expires_at",
    },
    // Documented limits: 3 requests/s sustained, burst 15, otherwise 429. We stay just below
    // them - honoring the other side's commitment is cheaper than any fallback strategy.
    rateLimit: { requestsPerSecond: 2.5, burst: 10 },
    configFields: [
      {
        key: "clientId",
        label: "Client ID",
        description: 'Aus dem SIMPL-Portal, Abschnitt „Get API access credentials".',
        required: true,
        secret: false,
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        description: "Wird verschlüsselt gespeichert und nie wieder angezeigt.",
        required: true,
        secret: true,
      },
    ],
    capabilities: ["lookupByExternalId", "documents"],
  },

  // A lookup on an identifier that certainly doesn't exist.
  //
  // This checks both things that matter: that exchanging credentials for a token succeeds
  // (wrong credentials end in a 401 and thus an auth error), and that the API responds at all.
  // The 404 on this call is the expected answer, not an error.
  async checkConnection(context) {
    await context.http.tryGet<SimplAsset>("/v1/assets/__dpp-connection-check", {
      query: { externalId: true },
    });
  },

  async lookupByExternalId(context, externalId) {
    const asset = await findAsset(context, externalId);
    if (asset) return asset;

    return findPart(context, externalId);
  },

  // The bytes of an attached file. Fetched only when the mapping says it belongs in the
  // passport - the platform calls this per wanted document, not per document found.
  //
  // The content type comes from the response and is a **claim**: it's checked against the
  // actual bytes over in the platform.
  async downloadDocument(context, externalDocumentId) {
    return context.http.getBinary(`/v1/resources/${encodeURIComponent(externalDocumentId)}/file`);
  },
};

// The order follows likelihood, not chance: someone typing an identifier almost always means
// their own upstream system's (`externalId`). Only if that doesn't exist is the internal SIMPL
// identifier tried.
//
// Cost of a hit: one call for the asset, one each for the asset type (resolves custom fields)
// and the manufacturer (brings the address). At 2.5 requests/s that's a good one and a half
// seconds - acceptable for an operation a human triggers and watches.
async function findAsset(
  context: ConnectorContext,
  externalId: string,
): Promise<ExternalProduct | undefined> {
  const path = `/v1/assets/${encodeURIComponent(externalId)}`;

  const asset =
    (await context.http.tryGet<SimplAsset>(path, { query: { externalId: true } })) ??
    (await context.http.tryGet<SimplAsset>(path));
  if (!asset) return undefined;

  const [assetType, manufacturer] = await Promise.all([
    asset.assetType?.id
      ? context.http.tryGet<SimplAssetType>(
          `/v1/asset-types/${encodeURIComponent(asset.assetType.id)}`,
        )
      : undefined,
    fetchOrganization(context, asset.manufacturer?.id),
  ]);

  return assetToProduct(asset, { assetType, manufacturer });
}

async function findPart(
  context: ConnectorContext,
  externalId: string,
): Promise<ExternalProduct | undefined> {
  const part = await context.http.tryGet<SimplPart>("/v1/parts/by-external-id", {
    query: { id: externalId },
  });
  if (!part) return undefined;

  return partToProduct(part, {
    manufacturer: await fetchOrganization(context, part.manufacturer?.id),
  });
}

// The short form on the product carries only identifier, title, and kind - the address an
// economic operator needs in the passport is only in the organization record. If this call
// fails, that's no reason to discard the whole import: the operator is then created without an
// address, which can be added later.
async function fetchOrganization(context: ConnectorContext, id: string | undefined) {
  if (!id) return undefined;

  try {
    return await context.http.tryGet<SimplOrganization>(
      `/v1/organizations/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    context.log("could not load the manufacturer's organisation record", {
      id,
      reason: error instanceof Error ? error.message : String(error),
    });

    return undefined;
  }
}

export { assetToProduct, partToProduct, resolveCustomFields } from "./mapping.js";
export type * from "./api-types.js";
