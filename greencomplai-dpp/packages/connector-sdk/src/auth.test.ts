import { describe, expect, it, vi } from "vitest";

import { createAuthorize, type ConnectorAuthSpec } from "./auth.js";
import { ConnectorAuthError, ConnectorUnavailableError } from "./types.js";

const CLIENT_CREDENTIALS: ConnectorAuthSpec = {
  kind: "client-credentials",
  tokenPath: "/v1/auth",
  clientIdKey: "clientId",
  clientSecretKey: "clientSecret",
  encoding: "form",
  accessTokenField: "access_token",
  expiresAtField: "expires_at",
};

function tokenFetch(body: unknown, status = 200) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function authorizeWith(fetchImpl: typeof fetch, now = () => 1_000_000) {
  return createAuthorize({
    baseUrl: "https://api.example.test",
    spec: CLIENT_CREDENTIALS,
    values: { clientId: "id-1", clientSecret: "secret-1" },
    fetchImpl,
    now,
  })!;
}

describe("static bearer", () => {
  it("uses the stored token without any exchange", async () => {
    const fetchImpl = tokenFetch({});
    const authorize = createAuthorize({
      baseUrl: "https://api.example.test",
      spec: { kind: "bearer", secretKey: "token" },
      values: { token: "static-token" },
      fetchImpl,
    })!;

    await expect(authorize()).resolves.toEqual({ authorization: "Bearer static-token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses to run without the configured secret", () => {
    expect(() =>
      createAuthorize({
        baseUrl: "https://api.example.test",
        spec: { kind: "bearer", secretKey: "token" },
        values: {},
      }),
    ).toThrow(ConnectorAuthError);
  });
});

describe("client credentials exchange", () => {
  it("posts the credentials to the declared token path only", async () => {
    const fetchImpl = tokenFetch({ access_token: "t-1", expires_at: 1_100 });

    await expect(authorizeWith(fetchImpl)()).resolves.toEqual({ authorization: "Bearer t-1" });

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(url.toString()).toBe("https://api.example.test/v1/auth");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("client_id=id-1&client_secret=secret-1");
    // No redirects here either: a redirect would carry the credentials to a
    // target the other side controls.
    expect(init.redirect).toBe("manual");
  });

  it("reuses the token until its expiry comes close", async () => {
    let clock = 1_000_000;
    // Expires at 1_500 seconds = 1_500_000 ms.
    const fetchImpl = tokenFetch({ access_token: "t-1", expires_at: 1_500 });
    const authorize = authorizeWith(fetchImpl, () => clock);

    await authorize();
    await authorize();
    clock = 1_400_000;
    await authorize();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Renews within the last minute before expiry, not only after.
    clock = 1_450_000;
    await authorize();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("exchanges once even when several calls arrive together", async () => {
    const fetchImpl = tokenFetch({ access_token: "t-1", expires_at: 9_999 });
    const authorize = authorizeWith(fetchImpl);

    await Promise.all([authorize(), authorize(), authorize()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to a short assumed lifetime when no expiry is given", async () => {
    let clock = 0;
    const fetchImpl = tokenFetch({ access_token: "t-1" });
    const authorize = authorizeWith(fetchImpl, () => clock);

    await authorize();
    clock = 4 * 60_000;
    await authorize();
    // Five minutes assumed lifetime, one minute lead time: at four minutes the
    // lead time has been reached.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports rejected credentials as an auth failure", async () => {
    await expect(authorizeWith(tokenFetch({}, 401))()).rejects.toBeInstanceOf(ConnectorAuthError);
  });

  it("reports a token response without a token as unavailable", async () => {
    await expect(authorizeWith(tokenFetch({ nope: true }))()).rejects.toBeInstanceOf(
      ConnectorUnavailableError,
    );
  });

  it("does not cache a failed exchange", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "t-2", expires_at: 9_999 }), {
          headers: { "content-type": "application/json" },
        }),
      ) as unknown as typeof fetch;
    const authorize = authorizeWith(fetchImpl);

    await expect(authorize()).rejects.toBeInstanceOf(ConnectorUnavailableError);
    await expect(authorize()).resolves.toEqual({ authorization: "Bearer t-2" });
  });
});
