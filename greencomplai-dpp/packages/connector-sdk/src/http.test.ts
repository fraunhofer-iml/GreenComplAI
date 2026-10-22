import { describe, expect, it, vi } from "vitest";

import {
  createReadOnlyHttpClient,
  ForbiddenRouteError,
  type AllowedRoute,
  type ReadOnlyHttpClientOptions,
} from "./http.js";
import { ConnectorAuthError, ConnectorRateLimitError, ConnectorUnavailableError } from "./types.js";

const ALLOWLIST: AllowedRoute[] = [
  { method: "GET", path: "/v1/assets" },
  { method: "GET", path: "/v1/assets/{id}" },
  { method: "GET", path: "/v1/assets/{id}/resources" },
];

function clientWith(fetchImpl: typeof fetch, overrides: Partial<ReadOnlyHttpClientOptions> = {}) {
  return createReadOnlyHttpClient({
    baseUrl: "https://api.example.test",
    allowlist: ALLOWLIST,
    fetchImpl,
    ...overrides,
  });
}

function jsonFetch(body: unknown, init: ResponseInit = {}) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
        ...init,
      }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("read-only http client", () => {
  it("sends an allowlisted GET and returns the parsed body", async () => {
    const fetchImpl = jsonFetch({ id: "a-1" });
    const client = clientWith(fetchImpl);

    await expect(client.get("/v1/assets/a-1")).resolves.toEqual({ id: "a-1" });

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(url.toString()).toBe("https://api.example.test/v1/assets/a-1");
    expect(init.method).toBe("GET");
  });

  it("appends query parameters and skips undefined ones", async () => {
    const fetchImpl = jsonFetch({});
    const client = clientWith(fetchImpl);

    await client.get("/v1/assets", { query: { cursor: "c1", updated_since: undefined } });

    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [URL];
    expect(url.search).toBe("?cursor=c1");
  });

  it("exposes no method that could write", () => {
    const client = clientWith(jsonFetch({}));

    // The guarantee is not "writing is rejected" but "there is no call for
    // it". This assertion fails as soon as someone adds a general `request`
    // method - which is exactly when it should.
    expect(Object.keys(client).sort()).toEqual(["get", "getBinary", "tryGet"]);
  });

  it("never sends a request body", async () => {
    const fetchImpl = jsonFetch({});
    const client = clientWith(fetchImpl);

    await client.get("/v1/assets");

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect("body" in init).toBe(false);
  });
});

describe("allowlist enforcement", () => {
  it.each([
    ["a path that is not listed", "/v1/jobs"],
    ["a write-shaped sibling path", "/v1/assets/a-1/delete"],
    ["traversal out of the allowed path", "/v1/assets/../../v1/jobs"],
    ["an encoded slash that would hide a segment", "/v1/assets/a%2f..%2fjobs"],
    ["a protocol-relative target", "//evil.test/v1/assets"],
    ["a backslash some parsers treat as a slash", "/v1\\assets"],
    ["a relative path", "v1/assets"],
    ["a query string smuggled into the path", "/v1/assets?x=1"],
    ["a fragment smuggled into the path", "/v1/assets#x"],
  ])("refuses %s without calling fetch", async (_label, path) => {
    const fetchImpl = jsonFetch({});
    const client = clientWith(fetchImpl);

    await expect(client.get(path)).rejects.toBeInstanceOf(ForbiddenRouteError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not let a path parameter swallow further segments", async () => {
    const client = clientWith(jsonFetch({}));

    // `/v1/assets/{id}` is allowed, `/v1/assets/{id}/qr-code` is not - a
    // placeholder that reached past the segment boundary would be a blanket
    // allowance for everything beneath it.
    await expect(client.get("/v1/assets/a-1/qr-code")).rejects.toBeInstanceOf(ForbiddenRouteError);
    await expect(client.get("/v1/assets/a-1/resources")).resolves.toBeDefined();
  });
});

describe("responses that must not be trusted", () => {
  it("refuses to follow a redirect", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: "https://evil.test/" } }),
    ) as unknown as typeof fetch;
    const client = clientWith(fetchImpl);

    await expect(client.get("/v1/assets")).rejects.toBeInstanceOf(ConnectorUnavailableError);
  });

  it("asks fetch not to follow redirects itself", async () => {
    const fetchImpl = jsonFetch({});
    await clientWith(fetchImpl).get("/v1/assets");

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(init.redirect).toBe("manual");
  });

  it.each([
    [401, ConnectorAuthError],
    [403, ConnectorAuthError],
    [429, ConnectorRateLimitError],
    [500, ConnectorUnavailableError],
  ])("maps %i to a distinguishable error", async (status, expected) => {
    const fetchImpl = vi.fn(async () => new Response("", { status })) as unknown as typeof fetch;

    await expect(clientWith(fetchImpl).get("/v1/assets")).rejects.toBeInstanceOf(expected);
  });

  it("treats 404 as an answer for tryGet and as a failure for get", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("", { status: 404 }),
    ) as unknown as typeof fetch;
    const client = clientWith(fetchImpl);

    await expect(client.tryGet("/v1/assets/missing")).resolves.toBeUndefined();
    await expect(client.get("/v1/assets/missing")).rejects.toBeInstanceOf(
      ConnectorUnavailableError,
    );
  });

  it("reports a network failure as unavailable rather than letting it escape raw", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    await expect(clientWith(fetchImpl).get("/v1/assets")).rejects.toBeInstanceOf(
      ConnectorUnavailableError,
    );
  });
});

describe("credentials and audit", () => {
  it("adds the authorize headers without the connector ever seeing them", async () => {
    const fetchImpl = jsonFetch({});
    const client = clientWith(fetchImpl, {
      authorize: async () => ({ authorization: "Bearer token-value" }),
    });

    await client.get("/v1/assets");

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer token-value");
  });

  it("reports every outbound call, including the failed ones", async () => {
    const events: unknown[] = [];
    const fetchImpl = vi.fn(
      async () => new Response("", { status: 500 }),
    ) as unknown as typeof fetch;

    await expect(
      clientWith(fetchImpl, { onRequest: (event) => events.push(event) }).get("/v1/assets"),
    ).rejects.toBeInstanceOf(ConnectorUnavailableError);

    expect(events).toEqual([
      expect.objectContaining({
        method: "GET",
        status: 500,
        url: "https://api.example.test/v1/assets",
      }),
    ]);
  });

  it("does not report a call that was never sent", async () => {
    const events: unknown[] = [];
    const fetchImpl = jsonFetch({});

    await expect(
      clientWith(fetchImpl, { onRequest: (event) => events.push(event) }).get("/v1/jobs"),
    ).rejects.toBeInstanceOf(ForbiddenRouteError);

    expect(events).toEqual([]);
  });
});

describe("self-throttling", () => {
  it("spends the burst first and then waits for the refill", async () => {
    let clock = 0;
    const slept: number[] = [];
    const fetchImpl = jsonFetch({});
    const client = clientWith(fetchImpl, {
      rateLimit: { requestsPerSecond: 2, burst: 3 },
      now: () => clock,
      sleep: async (ms) => {
        slept.push(ms);
        clock += ms;
      },
    });

    for (let i = 0; i < 5; i += 1) await client.get("/v1/assets");

    // Three calls come out of the bucket; the remaining two each wait 500 ms
    // for the refill at 2 requests per second.
    expect(slept).toEqual([500, 500]);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });
});
