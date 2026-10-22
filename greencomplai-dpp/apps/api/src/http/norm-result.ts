import type { ResultMessageType } from "@dpp/domain";
import type { StatusCode } from "hono/utils/http-status";

// The norm's result object (EN 18222 Table 13-16) - and why it lives next to
// `http/result.ts` instead of inside it.
//
// The internal error shape deliberately deviates from the norm in two places,
// and both deviations are right for the application and wrong for the facade:
//
//   * **`messages` (plural) instead of `message`.** Table 13 names the
//     attribute `message` with cardinality 0..* - a singular field name
//     carrying multiple messages. That is an unfortunate name for a client,
//     but it is the facade's contract.
//   * **`path`.** Table 14 doesn't know it. Without a field reference, a form
//     cannot attach a message to the input that caused it - hence the
//     internal shape carries it. The facade must not invent an attribute; the
//     path is folded into the text there instead of disappearing.
//
// Where the generic status code from Table 16 belongs is the third question,
// and the norm answers it across two places: Table 12 lists `statusCode` as
// the method's **output parameter**, and section 8 maps the logical model
// onto HTTPS/REST - so the generic status code is the HTTP status. The
// message's `code` attribute is, per Table 14, something else: a
// "technology-dependent status or error code", which is exactly our internal
// code (`DPP_NOT_FOUND`).
//
// Merging the two would be tempting and would destroy information: the
// generic code is already in the HTTP status, the internal one is nowhere else.

export type NormStatusCode =
  | "Success"
  | "SuccessCreated"
  | "SuccessAccepted"
  | "SuccessNoContent"
  | "ClientErrorBadRequest"
  | "ClientNotAuthorized"
  | "ClientForbidden"
  | "ClientMethodNotAllowed"
  | "ClientErrorResourceNotFound"
  | "ClientResourceConflict"
  | "ServerInternalError"
  | "ServerErrorBadGateway";

export type NormMessage = {
  messageType: ResultMessageType;
  text: string;
  code?: string;
  correlationId?: string;
  timestamp?: string;
};

// Table 13: the attribute is named `message` and carries 0..* messages.
export type NormResult = { message: NormMessage[] };

// Table 16 assigns each generic status code a meaning; the HTTP equivalent is
// the mapping from section 8.
// 204 is not a `ContentfulStatusCode` - a response with no content cannot by
// definition carry a body, hence the wider type.
const HTTP_STATUS: Record<NormStatusCode, StatusCode> = {
  Success: 200,
  SuccessCreated: 201,
  SuccessAccepted: 202,
  SuccessNoContent: 204,
  ClientErrorBadRequest: 400,
  ClientNotAuthorized: 401,
  ClientForbidden: 403,
  ClientMethodNotAllowed: 405,
  ClientErrorResourceNotFound: 404,
  ClientResourceConflict: 409,
  ServerInternalError: 500,
  ServerErrorBadGateway: 502,
};

// The reverse direction: the facade delegates to the internal API, which
// answers with an HTTP status and its own error code. Table 16 has no state
// for 422 - the norm doesn't distinguish "request malformed" from "request
// unreadable". `ClientErrorBadRequest` is the closest match, and the internal
// code is preserved in the text so the precision isn't lost.
export function normStatusFor(httpStatus: number): NormStatusCode {
  switch (httpStatus) {
    case 200:
      return "Success";
    case 201:
      return "SuccessCreated";
    case 202:
      return "SuccessAccepted";
    case 204:
      return "SuccessNoContent";
    case 401:
      return "ClientNotAuthorized";
    case 402:
    case 403:
      return "ClientForbidden";
    case 404:
      return "ClientErrorResourceNotFound";
    case 405:
      return "ClientMethodNotAllowed";
    case 409:
      return "ClientResourceConflict";
    case 502:
      return "ServerErrorBadGateway";
    default:
      return httpStatus >= 500 ? "ServerInternalError" : "ClientErrorBadRequest";
  }
}

export function httpStatusFor(status: NormStatusCode): StatusCode {
  return HTTP_STATUS[status];
}

// Translates the internal error shape into the norm's result object. The
// field reference isn't lost, it moves into the text: "productId: must not be
// empty" says the same thing a dedicated attribute would, just in a field the
// norm recognises.
export function toNormResult(
  body: unknown,
  httpStatus: number,
  correlationId?: string,
): NormResult {
  const internal = (body as { messages?: unknown })?.messages;
  const messages = Array.isArray(internal) ? internal : [];

  if (messages.length === 0) {
    return {
      message: [
        {
          messageType: httpStatus >= 500 ? "Exception" : "Error",
          text: `Request failed (${httpStatus})`,
          ...(correlationId ? { correlationId } : {}),
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  return {
    message: messages.map((raw) => {
      const entry = raw as {
        code?: string;
        correlationId?: string;
        messageType?: ResultMessageType;
        path?: string;
        text?: string;
        timestamp?: string;
      };
      const text = entry.path ? `${entry.path}: ${entry.text ?? ""}` : (entry.text ?? "");

      return {
        messageType: entry.messageType ?? "Error",
        text,
        // The internal code - Table 14 asks for the technology-dependent
        // code, not the generic one from Table 16. That one is in the HTTP
        // status.
        ...(entry.code ? { code: entry.code } : {}),
        ...(entry.correlationId ? { correlationId: entry.correlationId } : {}),
        ...(correlationId && !entry.correlationId ? { correlationId } : {}),
        timestamp: entry.timestamp ?? new Date().toISOString(),
      } satisfies NormMessage;
    }),
  };
}
