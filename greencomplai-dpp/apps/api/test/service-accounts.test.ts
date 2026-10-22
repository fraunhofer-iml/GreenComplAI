import { apiKeys } from "@dpp/db/schema";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { db } from "../src/db.js";
import {
  addMember,
  createOrganization,
  type OrganizationFixture,
  type TestClient,
} from "./helpers/client.js";
import { createDraftDpp, publicElement } from "./helpers/dpp.js";

// credentials for external systems (ERP, PLM, PIM, MES). Up to this
// point the API - including the freshly built norm facade - was only
// reachable with a browser cookie, so not reachable by a machine at all.
//
// The core claim of these tests is not that a key works. It is that a key
// can do **no more** than the human it belongs to: the same tenant boundary,
// the same roles, the same policies - plus a scope that restricts it further.

type ServiceAccount = { id: string; name: string; role: string; scopes: string[]; status: string };
type CreatedKey = { key: { id: string; keyPrefix: string }; plaintext: string };
type Messages = { messages: { code?: string; text: string }[] };

// Calls the app with a key instead of a session - exactly as an external
// system would.
async function withKey(key: string, path: string, init: { body?: unknown; method?: string } = {}) {
  const headers = new Headers({ Authorization: `Bearer ${key}` });
  if (init.body !== undefined) headers.set("Content-Type", "application/json");

  const response = await app.fetch(
    new Request(`http://localhost:3000${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
  );
  const text = await response.text();

  return {
    status: response.status,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : undefined,
  };
}

describe("service accounts and API keys", () => {
  let organization: OrganizationFixture;
  let editor: TestClient;
  let account: ServiceAccount;
  let readWriteKey: string;
  let operatorId: string;

  beforeAll(async () => {
    organization = await createOrganization("svc");
    editor = await addMember(organization, "editor");

    // Since a passport needs a resolvable economic operator; without one
    // the write test would fail on the reference check instead of on access.
    operatorId = `OP-SVC-${Date.now().toString(36)}`;
    await organization.admin.post("/economic-operators", {
      operatorId,
      legalName: "Service GmbH",
      roles: ["manufacturer"],
    });

    const created = await organization.admin.post<{ serviceAccount: ServiceAccount }>(
      "/service-accounts",
      { name: "ERP Nord", role: "editor", scopes: ["read", "write"] },
    );
    expect(created.status).toBe(201);
    account = created.body.serviceAccount;

    const key = await organization.admin.post<CreatedKey>(`/service-accounts/${account.id}/keys`, {
      label: "erste Rotation",
    });
    readWriteKey = key.body.plaintext;
  });

  describe("managing accounts", () => {
    it("creates one with a role and scopes", () => {
      expect(account.role).toBe("editor");
      expect(account.scopes).toEqual(["read", "write"]);
      expect(account.status).toBe("active");
    });

    it("is reserved for admins", async () => {
      const response = await editor.post("/service-accounts", {
        name: "heimlich",
        scopes: ["read"],
      });

      expect(response.status).toBe(403);
    });

    // One name per organization, so "which account is this" stays answerable.
    // The duplicate is the caller's conflict - 409, not 500.
    it("refuses a second account of the same name", async () => {
      const response = await organization.admin.post<Messages>("/service-accounts", {
        name: "ERP Nord",
        scopes: ["read"],
      });

      expect(response.status).toBe(409);
      expect(response.body.messages[0]?.code).toBe("SERVICE_ACCOUNT_NAME_TAKEN");
    });

    it("hides accounts of another organization", async () => {
      const rival = await createOrganization("svc-rival");

      const response = await rival.admin.get<{ serviceAccounts: ServiceAccount[] }>(
        "/service-accounts",
      );
      expect(response.body.serviceAccounts.map((a) => a.id)).not.toContain(account.id);
    });
  });

  describe("the secret", () => {
    it("comes back exactly once, at creation", async () => {
      const created = await organization.admin.post<CreatedKey>(
        `/service-accounts/${account.id}/keys`,
        {},
      );

      expect(created.status).toBe(201);
      expect(created.body.plaintext).toMatch(/^dpp_[0-9a-f]{16}_[0-9a-f]{64}$/);

      // Never again after this: the list shows the prefix, not the secret.
      const listed = await organization.admin.get<{ keys: Record<string, unknown>[] }>(
        `/service-accounts/${account.id}/keys`,
      );
      const serialized = JSON.stringify(listed.body);
      expect(serialized).not.toContain(created.body.plaintext);
      expect(serialized).toContain(created.body.key.keyPrefix);
    });

    // Reading the database must not yield a working key.
    it("is stored only as a hash", async () => {
      const created = await organization.admin.post<CreatedKey>(
        `/service-accounts/${account.id}/keys`,
        {},
      );

      const [row] = await db
        .select({ secretHash: apiKeys.secretHash })
        .from(apiKeys)
        .where(eq(apiKeys.id, created.body.key.id));

      expect(row?.secretHash).toMatch(/^[0-9a-f]{64}$/);
      expect(created.body.plaintext).not.toContain(row!.secretHash);
    });

    // Neither the response nor its status reveals whether a key exists for a
    // given prefix - otherwise it would be an oracle for that.
    it("answers a wrong secret exactly like an unknown key", async () => {
      const wrongSecret = `${readWriteKey.slice(0, readWriteKey.lastIndexOf("_"))}_${"0".repeat(64)}`;
      const unknown = `dpp_${"a".repeat(16)}_${"b".repeat(64)}`;

      const first = await withKey(wrongSecret, "/dpps");
      const second = await withKey(unknown, "/dpps");

      expect(first.status).toBe(401);
      expect(second.status).toBe(401);
      // Without the timestamp: it necessarily differs and says nothing about
      // the key. What is compared is what the caller actually gets told.
      const meaning = (body: unknown) =>
        (body as Messages).messages.map(({ code, text }) => ({ code, text }));
      expect(meaning(first.body)).toEqual(meaning(second.body));
    });
  });

  describe("calling the API with a key", () => {
    it("reads without a session and without an organization header", async () => {
      const response = await withKey(readWriteKey, "/dpps");

      expect(response.status).toBe(200);
    });

    // The tenant is fixed to the key. Moving it via the header would be
    // exactly the loophole this must prevent.
    it("ignores an organization header pointing elsewhere", async () => {
      const rival = await createOrganization("svc-header");
      const rivalDpp = await createDraftDpp(rival.admin, {});

      const response = await app.fetch(
        new Request("http://localhost:3000/dpps", {
          headers: {
            Authorization: `Bearer ${readWriteKey}`,
            "x-organization-id": rival.id,
          },
        }),
      );
      const body = (await response.json()) as { result: { dpps: { publicId: string }[] } };

      expect(response.status).toBe(200);
      expect(body.result.dpps.map((dpp) => dpp.publicId)).not.toContain(rivalDpp.publicId);
    });

    it("writes when the account's role allows it", async () => {
      const response = await withKey(readWriteKey, "/dpps", {
        method: "POST",
        body: {
          productId: `svc-${Date.now()}`,
          granularity: "model",
          dppSchemaVersion: "test-dictionary/2026.1",
          economicOperatorId: operatorId,
        },
      });

      expect(response.status).toBe(201);
    });

    it("reaches the norm facade, which was the point of all this", async () => {
      const dpp = await createDraftDpp(organization.admin, {
        dataElements: [publicElement("gewicht", "12 kg")],
      });

      const response = await withKey(readWriteKey, `/en18222/v1/dpps/${dpp.publicId}`);

      expect(response.status).toBe(200);
      expect((response.body as { productId: string }).productId).toBe(dpp.productId);
    });

    it("records the service account as the actor, not a person", async () => {
      const dpp = await createDraftDpp(organization.admin, {});
      await withKey(readWriteKey, `/dpps/${dpp.publicId}`);

      const audit = await organization.admin.get<{
        audit: { actorUserId: string; eventType: string }[];
      }>(`/dpps/${dpp.publicId}/audit-events`);

      expect(
        audit.body.audit.some((entry) => entry.actorUserId === `service-account:${account.id}`),
      ).toBe(true);
    });
  });

  describe("scopes limit what a key may do", () => {
    let readOnlyKey: string;

    beforeAll(async () => {
      const created = await organization.admin.post<{ serviceAccount: ServiceAccount }>(
        "/service-accounts",
        { name: "ERP Lesezugang", role: "admin", scopes: ["read"] },
      );
      const key = await organization.admin.post<CreatedKey>(
        `/service-accounts/${created.body.serviceAccount.id}/keys`,
        {},
      );
      readOnlyKey = key.body.plaintext;
    });

    it("allows reading", async () => {
      expect((await withKey(readOnlyKey, "/dpps")).status).toBe(200);
    });

    // The account is **admin** - the key still must not write. That is
    // exactly the point of a scope: a key for the nightly import should not
    // be able to delete just because its account could.
    it("refuses writing even though the account is an admin", async () => {
      const response = await withKey(readOnlyKey, "/dpps", {
        method: "POST",
        body: {
          productId: "x",
          granularity: "model",
          dppSchemaVersion: "y",
          economicOperatorId: "z",
        },
      });

      expect(response.status).toBe(403);
      expect((response.body as unknown as Messages).messages[0]?.code).toBe("SCOPE_REQUIRED");
    });
  });

  describe("the role still applies", () => {
    it("refuses a write the account's role does not allow", async () => {
      const created = await organization.admin.post<{ serviceAccount: ServiceAccount }>(
        "/service-accounts",
        { name: "ERP Betrachter", role: "viewer", scopes: ["read", "write"] },
      );
      const key = await organization.admin.post<CreatedKey>(
        `/service-accounts/${created.body.serviceAccount.id}/keys`,
        {},
      );

      // Scope allows writing, the role does not - both must agree.
      const response = await withKey(key.body.plaintext, "/dpps", {
        method: "POST",
        body: {
          productId: "x",
          granularity: "model",
          dppSchemaVersion: "y",
          economicOperatorId: "z",
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("rotation and revocation", () => {
    it("lets two keys of one account work at the same time — that is rotation", async () => {
      const second = await organization.admin.post<CreatedKey>(
        `/service-accounts/${account.id}/keys`,
        { label: "zweite Rotation" },
      );

      expect((await withKey(readWriteKey, "/dpps")).status).toBe(200);
      expect((await withKey(second.body.plaintext, "/dpps")).status).toBe(200);
    });

    it("stops a revoked key", async () => {
      const created = await organization.admin.post<CreatedKey>(
        `/service-accounts/${account.id}/keys`,
        {},
      );
      expect((await withKey(created.body.plaintext, "/dpps")).status).toBe(200);

      const revoked = await organization.admin.delete(
        `/service-accounts/${account.id}/keys/${created.body.key.id}`,
      );
      expect(revoked.status).toBe(200);

      expect((await withKey(created.body.plaintext, "/dpps")).status).toBe(401);
    });

    it("stops an expired key", async () => {
      const created = await organization.admin.post<CreatedKey>(
        `/service-accounts/${account.id}/keys`,
        { expiresAt: "2020-01-01T00:00:00Z" },
      );

      expect((await withKey(created.body.plaintext, "/dpps")).status).toBe(401);
    });

    it("stops every key of a disabled account at once", async () => {
      const created = await organization.admin.post<{ serviceAccount: ServiceAccount }>(
        "/service-accounts",
        { name: "ERP Süd", role: "editor", scopes: ["read"] },
      );
      const key = await organization.admin.post<CreatedKey>(
        `/service-accounts/${created.body.serviceAccount.id}/keys`,
        {},
      );
      expect((await withKey(key.body.plaintext, "/dpps")).status).toBe(200);

      await organization.admin.patch(`/service-accounts/${created.body.serviceAccount.id}`, {
        status: "disabled",
      });

      expect((await withKey(key.body.plaintext, "/dpps")).status).toBe(401);
    });
  });

  // A key that can mint new keys is no longer a limited permission - it is
  // one that renews itself.
  describe("a key cannot manage keys", () => {
    it("refuses to list service accounts", async () => {
      const response = await withKey(readWriteKey, "/service-accounts");

      expect(response.status).toBe(403);
      expect((response.body as unknown as Messages).messages[0]?.code).toBe("SESSION_REQUIRED");
    });

    it("refuses to mint another key", async () => {
      const response = await withKey(readWriteKey, `/service-accounts/${account.id}/keys`, {
        method: "POST",
        body: {},
      });

      expect(response.status).toBe(403);
    });
  });
});
