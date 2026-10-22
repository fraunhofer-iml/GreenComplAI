import {
  createDataDictionaryEntrySchema,
  createDataDictionaryRepositorySchema,
  createEconomicOperatorSchema,
  createFacilitySchema,
  createProductSchema,
  dataDictionaryEntriesResponseSchema,
  dataDictionaryEntryResponseSchema,
  dataDictionaryRepositoriesResponseSchema,
  dataDictionaryRepositoryResponseSchema,
  dictionaryEntryQuerySchema,
  economicOperatorResponseSchema,
  economicOperatorsResponseSchema,
  esrsProfileApplicationResponseSchema,
  esrsProfilesResponseSchema,
  setEsrsProfilesSchema,
  facilitiesResponseSchema,
  facilityResponseSchema,
  patchDataDictionaryEntrySchema,
  patchDataDictionaryRepositorySchema,
  patchEconomicOperatorSchema,
  patchFacilitySchema,
  patchProductSchema,
  productResponseSchema,
  productsResponseSchema,
} from "@dpp/schemas";
import { zValidator } from "../http/validator.js";
import type { Context } from "hono";
import { Hono } from "hono";

import type { AppBindings } from "../http/context.js";
import { requireRole } from "../http/context.js";
import { getOrganizationOrError } from "../http/organization.js";
import { jsonResponse } from "../http/response.js";
import { fieldResult, jsonError } from "../http/result.js";
import {
  getDataDictionaryEntry,
  getDataDictionaryEntriesForRepository,
  getDataDictionaryRepository,
  getDataDictionaryRepositories,
  getEconomicOperator,
  getDictionaryEsrsProfiles,
  getEconomicOperators,
  getFacilities,
  getFacility,
  getProduct,
  getProducts,
  registerDataDictionaryEntry,
  registerDataDictionaryRepository,
  registerEconomicOperator,
  registerFacility,
  registerProduct,
  setDictionaryEsrsProfiles,
  updateDataDictionaryEntry,
  updateDataDictionaryRepository,
  updateEconomicOperator,
  updateFacility,
  updateProduct,
} from "../services/catalog.js";

export const catalogRoutes = new Hono<AppBindings>()
  .get("/products", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const products = await getProducts(organizationId);
    return jsonResponse(c, productsResponseSchema, products, {
      context: "GET /products",
      key: "products",
    });
  })
  .get("/products/:productId", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const result = await getProduct(organizationId, c.req.param("productId"));
    if (!result.ok)
      return jsonError(c, result.message, { code: result.code, status: result.status });
    return jsonResponse(c, productResponseSchema, result.value, {
      context: "GET /products/:productId",
      key: "product",
    });
  })
  .post(
    "/products",
    requireRole("admin", "editor"),
    zValidator("json", createProductSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const product = await registerProduct(organizationId, c.req.valid("json"));
      return jsonResponse(c, productResponseSchema, product, {
        context: "POST /products",
        key: "product",
        status: 201,
      });
    },
  )
  .patch(
    "/products/:productId",
    requireRole("admin", "editor"),
    zValidator("json", patchProductSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await updateProduct(
        organizationId,
        c.req.param("productId"),
        c.req.valid("json"),
      );
      if (!result.ok)
        return jsonError(c, result.message, { code: result.code, status: result.status });
      return jsonResponse(c, productResponseSchema, result.value, {
        context: "PATCH /products/:productId",
        key: "product",
      });
    },
  )
  .get("/economic-operators", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const economicOperators = await getEconomicOperators(organizationId);
    return jsonResponse(c, economicOperatorsResponseSchema, economicOperators, {
      context: "GET /economic-operators",
      key: "economicOperators",
    });
  })
  .get("/economic-operators/:operatorId", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const result = await getEconomicOperator(organizationId, c.req.param("operatorId"));
    if (!result.ok)
      return jsonError(c, result.message, { code: result.code, status: result.status });
    return jsonResponse(c, economicOperatorResponseSchema, result.value, {
      context: "GET /economic-operators/:operatorId",
      key: "economicOperator",
    });
  })
  .post(
    "/economic-operators",
    requireRole("admin", "editor"),
    zValidator("json", createEconomicOperatorSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const economicOperator = await registerEconomicOperator(organizationId, c.req.valid("json"));
      return jsonResponse(c, economicOperatorResponseSchema, economicOperator, {
        context: "POST /economic-operators",
        key: "economicOperator",
        status: 201,
      });
    },
  )
  .patch(
    "/economic-operators/:operatorId",
    requireRole("admin", "editor"),
    zValidator("json", patchEconomicOperatorSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await updateEconomicOperator(
        organizationId,
        c.req.param("operatorId"),
        c.req.valid("json"),
      );
      if (!result.ok)
        return jsonError(c, result.message, { code: result.code, status: result.status });
      return jsonResponse(c, economicOperatorResponseSchema, result.value, {
        context: "PATCH /economic-operators/:operatorId",
        key: "economicOperator",
      });
    },
  )
  .get("/facilities", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    return jsonResponse(c, facilitiesResponseSchema, await getFacilities(organizationId), {
      context: "GET /facilities",
      key: "facilities",
    });
  })
  .get("/facilities/:facilityId", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const result = await getFacility(organizationId, c.req.param("facilityId"));
    if (!result.ok) return catalogError(c, result);
    return jsonResponse(c, facilityResponseSchema, result.value, {
      context: "GET /facilities/:facilityId",
      key: "facility",
    });
  })
  .post(
    "/facilities",
    requireRole("admin", "editor"),
    zValidator("json", createFacilitySchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await registerFacility(organizationId, c.req.valid("json"));
      if (!result.ok) return catalogError(c, result);
      return jsonResponse(c, facilityResponseSchema, result.value, {
        context: "POST /facilities",
        key: "facility",
        status: 201,
      });
    },
  )
  .patch(
    "/facilities/:facilityId",
    requireRole("admin", "editor"),
    zValidator("json", patchFacilitySchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await updateFacility(
        organizationId,
        c.req.param("facilityId"),
        c.req.valid("json"),
      );
      if (!result.ok) return catalogError(c, result);
      return jsonResponse(c, facilityResponseSchema, result.value, {
        context: "PATCH /facilities/:facilityId",
        key: "facility",
      });
    },
  )
  // ESRS requirements on the dictionary: a profile records the parent category
  // and required data points. The catalog is built into the system and is only
  // served here, never accepted.
  .get("/data-dictionary-repositories/:repositoryKey/esrs-profiles", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const result = await getDictionaryEsrsProfiles(organizationId, c.req.param("repositoryKey"));
    if (!result.ok) return catalogError(c, result);
    return jsonResponse(c, esrsProfilesResponseSchema, result.value, {
      context: "GET /data-dictionary-repositories/:repositoryKey/esrs-profiles",
      key: "esrs",
    });
  })
  .put(
    "/data-dictionary-repositories/:repositoryKey/esrs-profiles",
    requireRole("admin", "editor"),
    zValidator("json", setEsrsProfilesSchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await setDictionaryEsrsProfiles(
        organizationId,
        c.req.param("repositoryKey"),
        c.req.valid("json").profileKeys,
      );
      if (!result.ok) return catalogError(c, result);
      return jsonResponse(c, esrsProfileApplicationResponseSchema, result.value, {
        context: "PUT /data-dictionary-repositories/:repositoryKey/esrs-profiles",
        key: "result",
      });
    },
  )
  .get("/data-dictionary-repositories", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const repositories = await getDataDictionaryRepositories(organizationId);
    return jsonResponse(c, dataDictionaryRepositoriesResponseSchema, repositories, {
      context: "GET /data-dictionary-repositories",
      key: "repositories",
    });
  })
  .get("/data-dictionary-repositories/:repositoryKey/entries", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const result = await getDataDictionaryEntriesForRepository(
      organizationId,
      c.req.param("repositoryKey"),
    );
    if (!result.ok)
      return jsonError(c, result.message, { code: result.code, status: result.status });
    return jsonResponse(c, dataDictionaryEntriesResponseSchema, result.value, {
      context: "GET /data-dictionary-repositories/:repositoryKey/entries",
      key: "entries",
    });
  })
  .get("/data-dictionary-repositories/:repositoryKey", async (c) => {
    const organizationId = getOrganizationOrError(c);
    if (!organizationId) return undefined;

    const result = await getDataDictionaryRepository(organizationId, c.req.param("repositoryKey"));
    if (!result.ok)
      return jsonError(c, result.message, { code: result.code, status: result.status });
    return jsonResponse(c, dataDictionaryRepositoryResponseSchema, result.value, {
      context: "GET /data-dictionary-repositories/:repositoryKey",
      key: "repository",
    });
  })
  .post(
    "/data-dictionary-repositories",
    requireRole("admin", "editor"),
    zValidator("json", createDataDictionaryRepositorySchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const repository = await registerDataDictionaryRepository(
        organizationId,
        c.req.valid("json"),
      );
      return jsonResponse(c, dataDictionaryRepositoryResponseSchema, repository, {
        context: "POST /data-dictionary-repositories",
        key: "repository",
        status: 201,
      });
    },
  )
  .patch(
    "/data-dictionary-repositories/:repositoryKey",
    requireRole("admin", "editor"),
    zValidator("json", patchDataDictionaryRepositorySchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await updateDataDictionaryRepository(
        organizationId,
        c.req.param("repositoryKey"),
        c.req.valid("json"),
      );
      if (!result.ok)
        return jsonError(c, result.message, { code: result.code, status: result.status });
      return jsonResponse(c, dataDictionaryRepositoryResponseSchema, result.value, {
        context: "PATCH /data-dictionary-repositories/:repositoryKey",
        key: "repository",
      });
    },
  )
  // Entries are addressed through their dictionary. The flat /data-dictionary
  // routes are gone: since an entryKey exists once per dictionary version and
  // may be shared by two dictionaries, so it never identified one entry on its
  // own — the old routes answered from whichever row came back first.
  .get(
    "/data-dictionary-repositories/:repositoryKey/entries/:entryKey",
    zValidator("query", dictionaryEntryQuerySchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await getDataDictionaryEntry(
        organizationId,
        c.req.param("repositoryKey"),
        c.req.param("entryKey"),
        // Without an explicit version, the latest is returned - the one an
        // editor is currently working on.
        c.req.valid("query").version,
      );
      if (!result.ok) {
        return jsonError(c, result.message, { code: result.code, status: result.status });
      }
      return jsonResponse(c, dataDictionaryEntryResponseSchema, result.value, {
        context: "GET /data-dictionary-repositories/:repositoryKey/entries/:entryKey",
        key: "entry",
      });
    },
  )
  .post(
    "/data-dictionary-repositories/:repositoryKey/entries",
    requireRole("admin", "editor"),
    zValidator("json", createDataDictionaryEntrySchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await registerDataDictionaryEntry(
        organizationId,
        c.req.param("repositoryKey"),
        c.req.valid("json"),
      );
      if (!result.ok) {
        return jsonError(c, result.message, { code: result.code, status: result.status });
      }
      return jsonResponse(c, dataDictionaryEntryResponseSchema, result.value, {
        context: "POST /data-dictionary-repositories/:repositoryKey/entries",
        key: "entry",
        status: 201,
      });
    },
  )
  .patch(
    "/data-dictionary-repositories/:repositoryKey/entries/:entryKey",
    requireRole("admin", "editor"),
    zValidator("json", patchDataDictionaryEntrySchema),
    async (c) => {
      const organizationId = getOrganizationOrError(c);
      if (!organizationId) return undefined;

      const result = await updateDataDictionaryEntry(
        organizationId,
        c.req.param("repositoryKey"),
        c.req.param("entryKey"),
        c.req.valid("json"),
      );
      if (!result.ok) {
        return jsonError(c, result.message, { code: result.code, status: result.status });
      }
      return jsonResponse(c, dataDictionaryEntryResponseSchema, result.value, {
        context: "PATCH /data-dictionary-repositories/:repositoryKey/entries/:entryKey",
        key: "entry",
      });
    },
  );

// Ablehnungen aus dem Katalog-Service. Eine Referenzverletzung bringt ihre
// Meldungen mit Feldbezug mit ; alles andere ist eine Zeile.
function catalogError(
  c: Context<AppBindings>,
  result: {
    code: string;
    issues?: { path?: string; text: string }[];
    message: string;
    status: 404 | 422;
  },
) {
  if (result.issues?.length) {
    return c.json(fieldResult(result.issues, { code: result.code }), result.status);
  }

  return jsonError(c, result.message, { code: result.code, status: result.status });
}
