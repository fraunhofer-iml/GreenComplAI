import { Hono } from "hono";

import {
  publicDictionaryEntriesResponseSchema,
  publicDictionaryResponseSchema,
  publicDppQuerySchema,
  publicDppResponseSchema,
} from "@dpp/schemas";

import { getPublicBlobDownloadUrl } from "../services/blobs.js";
import { zValidator } from "../http/validator.js";
import { jsonResponse } from "../http/response.js";
import { jsonError } from "../http/result.js";
import {
  getPublicDictionary,
  getPublicDictionaryEntries,
  getPublicDigitalProductPassport,
  getPublicProductPassport,
} from "../services/public-dpps.js";

export const publicRoutes = new Hono()
  // Anonymous document download. Reachable only for blobs a publish released
  // into a public projection; everything else is a 404 regardless of tenant.
  .get("/public/documents/:blobId/content", async (c) => {
    const result = await getPublicBlobDownloadUrl(c.req.param("blobId"));
    if (!result.ok) {
      return jsonError(c, result.message, {
        code: result.code,
        status: result.status,
      });
    }

    return c.redirect(result.value.url, 302);
  })
  // A published DPP resolved by the tenant's own product identifier. It lives
  // under /public/dpps because a DPP is what it returns — /public/products
  // promised a product resource that does not exist.
  .get("/public/dpps", zValidator("query", publicDppQuerySchema), async (c) => {
    const result = await getPublicProductPassport(c.req.valid("query").productId);
    if (!result.ok) {
      return jsonError(c, result.message, {
        code: result.code,
        status: result.status,
      });
    }

    return jsonResponse(c, publicDppResponseSchema, result.value, {
      context: "GET /public/dpps?productId",
    });
  })
  // `dppId` accepts either identifier space: the short public id from the QR
  // link, or the canonical URN. The old name claimed it was always the URN.
  .get("/public/dpps/:dppId", async (c) => {
    const result = await getPublicDigitalProductPassport(c.req.param("dppId"));
    if (!result.ok) {
      return jsonError(c, result.message, {
        code: result.code,
        status: result.status,
      });
    }

    return jsonResponse(c, publicDppResponseSchema, result.value, {
      context: "GET /public/dpps/:dppId",
    });
  })
  .get("/public/dictionaries/:repositoryKey", async (c) => {
    const result = await getPublicDictionary(c.req.param("repositoryKey"));
    if (!result.ok) {
      return jsonError(c, result.message, {
        code: result.code,
        status: result.status,
      });
    }

    return jsonResponse(c, publicDictionaryResponseSchema, result.value, {
      context: "GET /public/dictionaries/:repositoryKey",
    });
  })
  .get("/public/dictionaries/:repositoryKey/entries", async (c) => {
    const result = await getPublicDictionaryEntries(c.req.param("repositoryKey"));
    if (!result.ok) {
      return jsonError(c, result.message, {
        code: result.code,
        status: result.status,
      });
    }

    return jsonResponse(c, publicDictionaryEntriesResponseSchema, result.value, {
      context: "GET /public/dictionaries/:repositoryKey/entries",
    });
  });
