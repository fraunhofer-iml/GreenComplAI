import { healthResponseSchema, readinessResponseSchema } from "@dpp/schemas";
import { Hono } from "hono";

import { jsonResponse } from "../http/response.js";
import { checkReadiness } from "../services/health.js";

export const healthRoutes = new Hono()
  // Liveness: process is up. Does not touch dependencies.
  .get("/health", (c) =>
    jsonResponse(
      c,
      healthResponseSchema,
      { ok: true, service: "dpp-api", timestamp: new Date().toISOString() },
      { context: "GET /health" },
    ),
  )
  // Readiness: can serve traffic only if database and object storage respond.
  // Probes are unauthenticated, so the payload goes through a schema like any
  // other: a dependency check must report up/down, never why — a driver's error
  // message quotes the connection string.
  .get("/ready", async (c) => {
    const report = await checkReadiness();
    return jsonResponse(
      c,
      readinessResponseSchema,
      { ...report, service: "dpp-api", timestamp: new Date().toISOString() },
      { context: "GET /ready", status: report.ok ? 200 : 503 },
    );
  });
