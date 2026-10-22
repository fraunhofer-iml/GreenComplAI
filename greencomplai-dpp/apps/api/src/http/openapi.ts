import { resultSchema } from "@dpp/schemas";
import { z } from "zod";

import { env } from "../config.js";
import { API_VERSION_PREFIX, operations, type Operation } from "./openapi-catalog.js";

// The OpenAPI document is built from the Zod schemas the endpoints actually
// use, not from a separate description. A hand-maintained description is a
// third copy of the same fact (after handler and schema) and is the first
// to go stale.
//
// What is written by hand here is the mapping: which path uses which schema,
// what it is for, what it returns. The contract test checks this list
// against the Hono routes that are actually registered - a new route without
// an entry makes it fail.

type JsonSchema = Record<string, unknown>;

// Transforms (the ISO date coercer, query preprocessing) cannot be expressed
// in JSON Schema. `unrepresentable: "any"` lets them through, and the
// affected schemas carry via `.meta()` what actually goes over the wire.
function toJsonSchema(schema: z.ZodType, io: "input" | "output"): JsonSchema {
  const json = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    unrepresentable: "any",
  }) as JsonSchema;
  delete json.$schema;
  return json;
}

// A success carries its payload under exactly one key (`{ dpp: ... }`,
// `{ result: ... }`). The envelope is built here so the documentation shows
// the same shape that `respond()` produces.
function successSchema(operation: Operation): JsonSchema | undefined {
  if (!operation.response) return undefined;
  const payload = toJsonSchema(operation.response.schema, "output");
  if (!operation.response.key) return payload;

  return {
    type: "object",
    properties: { [operation.response.key]: payload },
    required: [operation.response.key],
  };
}

const errorSchema = () => toJsonSchema(resultSchema, "output");

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: errorSchema() } },
});

// Which errors an endpoint can produce follows from its position in the
// chain, not from an enumeration per route: whoever needs a tenant can fail
// on membership; whoever accepts a body can fail on its content.
function errorResponses(operation: Operation) {
  const responses: Record<string, unknown> = {
    "500": errorResponse("Interner Fehler (Exception, prEN 18222 Tabelle 15)"),
  };

  if (operation.auth !== "none") {
    responses["401"] = errorResponse("Nicht angemeldet");
  }
  if (operation.auth === "tenant") {
    responses["400"] = errorResponse("Organisationsheader fehlt");
    responses["403"] = errorResponse("Keine Mitgliedschaft oder Rolle genügt nicht");
  }
  if (operation.request || operation.query) {
    responses["422"] = errorResponse("Eingabe abgelehnt — eine Meldung je verletztem Feld");
  }
  for (const [status, description] of Object.entries(operation.errors ?? {})) {
    responses[status] = errorResponse(description);
  }

  return responses;
}

// Hono writes `:param`, OpenAPI `{param}`.
function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function pathParameters(path: string) {
  return [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map(([, name]) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
}

function queryParameters(operation: Operation) {
  if (!operation.query) return [];

  const json = toJsonSchema(operation.query, "input");
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((json.required ?? []) as string[]);

  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: "query",
    required: required.has(name),
    schema,
  }));
}

function organizationHeader(operation: Operation) {
  if (operation.auth !== "tenant") return [];

  return [
    {
      name: "x-organization-id",
      in: "header",
      required: true,
      description:
        "Der Mandant, in dem die Anfrage gilt. Die Mitgliedschaft wird geprüft, nicht geglaubt.",
      schema: { type: "string", format: "uuid" },
    },
  ];
}

function buildOperation(operation: Operation) {
  const success = successSchema(operation);

  return {
    summary: operation.summary,
    description: operation.description,
    tags: [operation.tag],
    security: operation.auth === "none" ? [] : [{ sessionCookie: [] }],
    parameters: [
      ...pathParameters(operation.path),
      ...queryParameters(operation),
      ...organizationHeader(operation),
    ],
    ...(operation.request
      ? {
          requestBody: {
            required: true,
            content: {
              [operation.requestContentType ?? "application/json"]: {
                schema: toJsonSchema(operation.request, "input"),
              },
            },
          },
        }
      : {}),
    ...(operation.requestContentType === "multipart/form-data" && !operation.request
      ? {
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                  required: ["file"],
                },
              },
            },
          },
        }
      : {}),
    responses: {
      [String(operation.status ?? 200)]: success
        ? {
            description: operation.response?.description ?? "Erfolg",
            content: { "application/json": { schema: success } },
          }
        : { description: operation.response?.description ?? "Erfolg" },
      ...errorResponses(operation),
    },
  };
}

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const operation of operations) {
    const path = `${API_VERSION_PREFIX}${toOpenApiPath(operation.path)}`;
    paths[path] ??= {};
    paths[path][operation.method] = buildOperation(operation);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "DPP-Plattform API",
      version: "1.0.0",
      description: [
        "Die versionierte Fläche liegt unter `/v1`.",
        "",
        "Die unversionierten Pfade (`/dpps`, `/members`, …) beantworten dieselben",
        "Anfragen weiter, tragen aber `Deprecation` und `Sunset` und verschwinden",
        "mit dem dort genannten Datum. Neue Integrationen sprechen `/v1`.",
        "",
        "Fehler antworten einheitlich mit `{ messages: [...] }` (prEN 18222",
        "Tabelle 14/15); Erfolge tragen bewusst keinen Envelope (Tabelle 16).",
      ].join("\n"),
    },
    servers: [{ url: env.API_ORIGIN }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
          description: "Sitzungscookie aus dem Anmeldevorgang (`/api/auth/sign-in/email`).",
        },
      },
    },
    paths,
  };
}
