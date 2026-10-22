import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodIssue } from "zod";

import type { Result, ResultMessage, ResultMessageType } from "@dpp/domain";

// The single response shape for anything that is not a success (prEN 18222).
// Before the middleware answered with `{ error: { code, message } }` while
// the services answered with this envelope — a client had to know which layer
// rejected it in order to read the reason.

type ResultOptions = {
  code?: string;
  correlationId?: string;
  status?: ContentfulStatusCode;
  type?: ResultMessageType;
};

export function result(text: string, options: ResultOptions = {}): Result {
  return {
    messages: [
      {
        messageType: options.type ?? "Error",
        text,
        code: options.code,
        correlationId: options.correlationId,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function jsonError(c: Context, text: string, options: ResultOptions = {}) {
  return c.json(result(text, options), options.status ?? 400);
}

// Like `result`, but tied to a field: one message per violated reference
// instead of a single collective message. `zValidator` has produced this shape
// for schema errors since ; this covers checks that need a database lookup
// (does this operator exist? this document?), which serve the same purpose -
// attaching the message to the field that caused it.
export function fieldResult(
  issues: readonly { path?: string; text: string }[],
  options: ResultOptions = {},
): Result {
  const timestamp = new Date().toISOString();
  const messages: ResultMessage[] = issues.map((issue) => ({
    messageType: options.type ?? "Error",
    text: issue.text,
    code: options.code,
    path: issue.path,
    timestamp,
  }));

  return { messages };
}

// Turns a Zod failure into one message per offending field, so a form can put
// each message next to its input instead of showing a page-level error.
export function validationResult(
  error: { issues: readonly ZodIssue[] },
  code = "VALIDATION_FAILED",
): Result {
  const timestamp = new Date().toISOString();
  const messages: ResultMessage[] = error.issues.map((issue) => ({
    messageType: "Error",
    text: issue.message,
    code,
    path: issue.path.map(String).join("."),
    timestamp,
  }));

  // A ZodError always carries issues, but an empty list would otherwise produce
  // a rejection that states no reason at all.
  if (messages.length === 0) {
    messages.push({ messageType: "Error", text: "Invalid request", code, timestamp });
  }

  return { messages };
}

export function exceptionResult(correlationId: string): Result {
  return {
    messages: [
      {
        messageType: "Exception",
        // Deliberately opaque: an unhandled failure's message can carry
        // connection strings or row contents. The correlation id is what ties
        // this response to the stack trace in the log.
        text: `Unexpected server error. Reference: ${correlationId}`,
        code: "INTERNAL_ERROR",
        correlationId,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
