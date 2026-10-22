import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { serializeResponse } from "./response.js";

const schema = z.object({ id: z.string(), name: z.string() });

describe("serializeResponse", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes a matching payload through", () => {
    expect(serializeResponse(schema, { id: "1", name: "Bolt" }, "test")).toEqual({
      id: "1",
      name: "Bolt",
    });
  });

  // The whole point: a field the schema does not name must not reach the client,
  // whatever the service decided to hand over.
  it("strips a field the schema does not know", () => {
    const result = serializeResponse(
      schema,
      { id: "1", name: "Bolt", storageKey: "org/1/blobs/secret" },
      "test",
    );

    expect(result).toEqual({ id: "1", name: "Bolt" });
    expect(JSON.stringify(result)).not.toContain("storageKey");
  });

  it("logs what it stripped rather than dropping it silently", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    serializeResponse(schema, { id: "1", name: "Bolt", token: "redeem-me" }, "GET /things");

    // Silence would make a leak and a stale schema look identical - both need to
    // be noticed, one is a bug in the payload, the other in the schema.
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("token");
    expect(warn.mock.calls[0]?.[0]).toContain("GET /things");
  });

  it("strips nested fields too", () => {
    const nested = z.object({ item: z.object({ id: z.string() }) });

    const result = serializeResponse(nested, { item: { id: "1", secret: "x" } }, "test");

    expect(result).toEqual({ item: { id: "1" } });
  });

  it("strips inside arrays", () => {
    const list = z.array(z.object({ id: z.string() }));

    const result = serializeResponse(list, [{ id: "1", token: "x" }], "test");

    expect(JSON.stringify(result)).not.toContain("token");
  });

  it("does not warn when nothing was dropped", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    serializeResponse(schema, { id: "1", name: "Bolt" }, "test");

    expect(warn).not.toHaveBeenCalled();
  });

  // A payload that cannot satisfy its own schema is a server bug. Shipping it
  // half-formed would break the client anyway, and silently - better to fail
  // loudly and let the error handler answer with a correlation id.
  it("throws when the payload does not satisfy the schema", () => {
    expect(() => serializeResponse(schema, { id: "1" }, "GET /things")).toThrow(/GET \/things/);
  });

  it("names the offending field in the thrown error", () => {
    expect(() => serializeResponse(schema, { id: 1, name: "Bolt" }, "test")).toThrow(/id/);
  });
});
