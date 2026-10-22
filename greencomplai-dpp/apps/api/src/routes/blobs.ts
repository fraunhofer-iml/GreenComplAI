import { Hono } from "hono";

import { documentDownloadResponseSchema, documentResponseSchema } from "@dpp/schemas";

import type { AppBindings } from "../http/context.js";
import {
  getActorUserId,
  getOrganizationRole,
  getRequiredOrganizationId,
  requireRole,
} from "../http/context.js";
import { jsonResponse } from "../http/response.js";
import { jsonError } from "../http/result.js";
import { getBlobDownloadUrl, getBlobMetadata, uploadBlob } from "../services/blobs.js";

export const blobRoutes = new Hono<AppBindings>()
  // Uploading is a write operation on tenant data: viewers and authorities must
  // not be able to put objects into the store.
  .post("/documents", requireRole("admin", "editor"), async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      return jsonError(c, "Expected a multipart form field 'file'.", {
        code: "FILE_REQUIRED",
        status: 400,
      });
    }

    const outcome = await uploadBlob({
      actorUserId: getActorUserId(c),
      file,
      organizationId: getRequiredOrganizationId(c),
    });
    if (!outcome.ok) {
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }

    return jsonResponse(c, documentResponseSchema, outcome.value, {
      context: "POST /documents",
      key: "result",
      status: 201,
    });
  })
  .get("/documents/:blobId", async (c) => {
    const outcome = await getBlobMetadata(
      getRequiredOrganizationId(c),
      getActorUserId(c),
      getOrganizationRole(c),
      c.req.param("blobId"),
    );
    if (!outcome.ok) {
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }

    return jsonResponse(c, documentResponseSchema, outcome.value, {
      context: "GET /documents/:blobId",
      key: "result",
    });
  })
  // Same check as /content, but returns the presigned URL as a payload
  // instead of redirecting. Clicking a link in the browser carries no
  // organization header - the UI calls this endpoint, gets the URL, and
  // navigates there itself.
  .get("/documents/:blobId/download-url", async (c) => {
    const outcome = await getBlobDownloadUrl(
      getRequiredOrganizationId(c),
      getActorUserId(c),
      getOrganizationRole(c),
      c.req.param("blobId"),
    );
    if (!outcome.ok) {
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }

    return jsonResponse(c, documentDownloadResponseSchema, outcome.value, {
      context: "GET /documents/:blobId/download-url",
      key: "result",
    });
  })
  .get("/documents/:blobId/content", async (c) => {
    const outcome = await getBlobDownloadUrl(
      getRequiredOrganizationId(c),
      getActorUserId(c),
      getOrganizationRole(c),
      c.req.param("blobId"),
    );
    if (!outcome.ok) {
      return jsonError(c, outcome.message, { code: outcome.code, status: outcome.status });
    }

    return c.redirect(outcome.value.url, 302);
  });
