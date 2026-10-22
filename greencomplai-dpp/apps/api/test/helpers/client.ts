import { randomUUID } from "node:crypto";

import type { OrganizationRole } from "@dpp/domain";

import { app } from "../../src/app.js";

// Drives the real app in-process: every request goes through the actual CORS,
// rate-limit, auth and membership middleware, so a test that passes here is
// testing the deployed chain rather than a mock of it.
export type ApiResponse<T = unknown> = {
  body: T;
  headers: Headers;
  status: number;
};

async function request(
  path: string,
  init: RequestInit & { organizationId?: string | undefined } = {},
): Promise<ApiResponse> {
  const { organizationId, ...rest } = init;
  const headers = new Headers(rest.headers);
  // Only for JSON bodies: FormData must keep the Content-Type undici generates,
  // because that is what carries the multipart boundary.
  if (!headers.has("Content-Type") && typeof rest.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (organizationId) headers.set("x-organization-id", organizationId);

  const response = await app.fetch(
    new Request(`http://localhost:3000${path}`, { ...rest, headers }),
  );
  const text = await response.text();

  return {
    status: response.status,
    headers: response.headers,
    body: parseBody(text),
  };
}

// Hono answers an unmatched route with plain text, and a redirect has no body
// at all: keep the raw text rather than throwing, so a test asserting on the
// status still gets there.
function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export type TestUser = {
  cookie: string;
  email: string;
  id: string;
  name: string;
};

// A caller bound to one user and (optionally) one organization.
export class TestClient {
  constructor(
    readonly user: TestUser,
    private readonly organizationId?: string | undefined,
  ) {}

  forOrganization(organizationId: string): TestClient {
    return new TestClient(this.user, organizationId);
  }

  get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.send<T>("GET", path);
  }

  post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.send<T>("POST", path, body);
  }

  patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.send<T>("PATCH", path, body);
  }

  put<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.send<T>("PUT", path, body);
  }

  delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.send<T>("DELETE", path);
  }

  // Raw variant for multipart bodies, where the boundary header must survive.
  sendRaw<T = unknown>(method: string, path: string, body: BodyInit): Promise<ApiResponse<T>> {
    return request(path, {
      method,
      body,
      headers: { Cookie: this.user.cookie },
      organizationId: this.organizationId,
    }) as Promise<ApiResponse<T>>;
  }

  private send<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { Cookie: this.user.cookie },
      organizationId: this.organizationId,
    }) as Promise<ApiResponse<T>>;
  }
}

// Anonymous caller: no cookie, no organization header — the public surface.
export const anonymous = {
  get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return request(path) as Promise<ApiResponse<T>>;
  },
  post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }) as Promise<ApiResponse<T>>;
  },
};

export const PASSWORD = "integration-test-password";

// Signs a user up through the real Better Auth handler and keeps the session
// cookie it hands back. Registration goes through the same invite gate as
// production; the suite runs with ALLOW_OPEN_SIGNUP=true so fixtures need no
// invitation, and the invite-only test closes it explicitly.
export async function createUser(prefix = "user"): Promise<TestUser> {
  const email = `${prefix}-${randomUUID()}@example.test`;
  const name = `${prefix} ${randomUUID().slice(0, 8)}`;

  const response = await app.fetch(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, name }),
    }),
  );

  if (!response.ok) {
    throw new Error(`Sign-up failed (${response.status}): ${await response.text()}`);
  }

  const cookie = extractSessionCookie(response);
  const payload = (await response.json()) as { user?: { id?: string } };
  const id = payload.user?.id;
  if (!id) throw new Error("Sign-up returned no user id");

  return { cookie, email, id, name };
}

export async function signIn(email: string): Promise<string> {
  const response = await app.fetch(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD }),
    }),
  );
  if (!response.ok) {
    throw new Error(`Sign-in failed (${response.status}): ${await response.text()}`);
  }

  return extractSessionCookie(response);
}

export async function signUpRaw(email: string, name: string) {
  const response = await app.fetch(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, name }),
    }),
  );

  return { status: response.status, body: await response.text() };
}

function extractSessionCookie(response: Response): string {
  const raw = response.headers.getSetCookie?.() ?? [];
  const session = raw.find((cookie) => cookie.startsWith("better-auth.session_token="));
  if (!session) throw new Error("No session cookie in the auth response");

  // Keep only the name=value pair; the attributes are for a browser, not for us.
  return session.split(";")[0] ?? "";
}

export type OrganizationFixture = {
  admin: TestClient;
  id: string;
  slug: string;
};

// Creates an organization owned by a fresh admin. Whoever creates it becomes its
// admin, which is the app's own bootstrap rule.
export async function createOrganization(prefix = "org"): Promise<OrganizationFixture> {
  const user = await createUser(`${prefix}-admin`);
  const client = new TestClient(user);
  const slug = `${prefix}-${randomUUID().slice(0, 8)}`;

  const created = await client.post<{ organization: { id: string } }>("/organizations", {
    name: `Test ${slug}`,
    slug,
  });
  if (created.status !== 201 && created.status !== 200) {
    throw new Error(`Creating the organization failed (${created.status})`);
  }

  const id = created.body.organization.id;
  const admin = client.forOrganization(id);
  await createTestDictionary(admin);

  return { admin, id, slug };
}

// The dictionary every test passport binds to.
//
// Test tenants used to have none, on the grounds that an unresolved reference
// was only a warning - so a test that was not about the dictionary needed no
// dictionary. Publishing now refuses a binding that resolves to nothing, which
// is the point: a passport validated against no entries passes everything.
//
// Left empty. An empty dictionary is a legitimate one and requires nothing of
// the passports bound to it, so tests that are not about the vocabulary carry
// on saying nothing about it. A test that puts a reference on an element brings
// its own dictionary and binds to that.
export const TEST_DICTIONARY_KEY = "test-dictionary";
export const TEST_DICTIONARY_VERSION = "2026.1";
export const TEST_DICTIONARY_BINDING = `${TEST_DICTIONARY_KEY}/${TEST_DICTIONARY_VERSION}`;

async function createTestDictionary(admin: TestClient): Promise<void> {
  const response = await admin.post("/data-dictionary-repositories", {
    repositoryKey: TEST_DICTIONARY_KEY,
    name: { de: "Test-Wörterbuch" },
    // Unique per tenant: `(namespace_uri, version)` is unique across the whole
    // database, not per organization. A fixed namespace would let the first
    // tenant create the dictionary and every later one fail.
    namespaceUri: `https://dictionary.test/${randomUUID()}/`,
    version: TEST_DICTIONARY_VERSION,
    status: "active",
  });
  if (response.status !== 201) {
    throw new Error(
      `Creating the test dictionary failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
}

// Adds a member in the given role by inviting them and having them sign up: the
// create hook auto-accepts pending invitations, so this is the production path
// rather than a direct membership insert.
export async function addMember(
  organization: OrganizationFixture,
  role: OrganizationRole,
): Promise<TestClient> {
  const email = `${role}-${randomUUID()}@example.test`;

  const invited = await organization.admin.post("/invitations", { email, role });
  if (invited.status !== 201) {
    throw new Error(`Inviting the ${role} failed (${invited.status})`);
  }

  const response = await app.fetch(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, name: `${role} member` }),
    }),
  );
  if (!response.ok) {
    throw new Error(`Sign-up of the invited ${role} failed (${response.status})`);
  }

  const payload = (await response.json()) as { user?: { id?: string } };
  const user: TestUser = {
    cookie: extractSessionCookie(response),
    email,
    id: payload.user?.id ?? "",
    name: `${role} member`,
  };

  return new TestClient(user, organization.id);
}
