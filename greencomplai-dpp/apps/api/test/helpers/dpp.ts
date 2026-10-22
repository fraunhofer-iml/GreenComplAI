import { randomUUID } from "node:crypto";

import type { DppSnapshot } from "@dpp/domain";

import { TEST_DICTIONARY_BINDING, type TestClient } from "./client.js";

export type CreatedDpp = {
  digitalProductPassportId: string;
  productId: string;
  publicId: string;
};

type DraftOverrides = {
  collections?: unknown[];
  dataElements?: unknown[];
  economicOperatorId?: string;
  productId?: string;
};

// Since a passport's economic operator must exist. The helper used to make
// up a random identifier - convenient, but it ran every test against a state
// the API should never have accepted. Now it creates exactly one real operator
// per tenant and remembers it; a test that wants to check the *missing*
// reference passes the identifier itself.
const operatorByClient = new WeakMap<TestClient, Promise<string>>();

function ensureEconomicOperator(client: TestClient): Promise<string> {
  const existing = operatorByClient.get(client);
  if (existing) return existing;

  const pending = (async () => {
    const operatorId = `operator-${randomUUID().slice(0, 8)}`;
    const response = await client.post(`/economic-operators`, {
      operatorId,
      legalName: `Test Operator ${operatorId}`,
      roles: ["manufacturer"],
    });
    if (response.status !== 201) {
      throw new Error(
        `Creating the economic operator failed (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }

    return operatorId;
  })();

  operatorByClient.set(client, pending);
  return pending;
}

// Creates a draft through the real endpoint.
export async function createDraftDpp(
  client: TestClient,
  overrides: DraftOverrides = {},
): Promise<CreatedDpp> {
  const productId = overrides.productId ?? `product-${randomUUID()}`;
  const economicOperatorId = overrides.economicOperatorId ?? (await ensureEconomicOperator(client));

  const response = await client.post<{ dpp: DppSnapshot; publicId: string }>("/dpps", {
    productId,
    granularity: "model",
    dppSchemaVersion: TEST_DICTIONARY_BINDING,
    economicOperatorId,
    collections: overrides.collections ?? [],
    dataElements: overrides.dataElements ?? [],
  });

  if (response.status !== 201) {
    throw new Error(
      `Creating the draft failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }

  return {
    digitalProductPassportId: response.body.dpp.digitalProductPassportId,
    productId,
    publicId: response.body.publicId,
  };
}

// Walks a draft all the way to published: submit for review, then publish. The
// admin client must be an admin — publishing is admin-only (four-eyes, G3).
export async function publishDpp(admin: TestClient, dppId: string): Promise<void> {
  const submitted = await admin.put(`/dpps/${dppId}/status`, { status: "review" });
  if (submitted.status !== 200) {
    throw new Error(
      `Submitting for review failed (${submitted.status}): ${JSON.stringify(submitted.body)}`,
    );
  }

  const published = await admin.put(`/dpps/${dppId}/status`, { status: "published" });
  if (published.status !== 200) {
    throw new Error(`Publishing failed (${published.status}): ${JSON.stringify(published.body)}`);
  }
}

export function publicElement(elementId: string, value: unknown) {
  return {
    elementId,
    kind: "single" as const,
    value,
    valueDataType: "string",
    visibility: "public" as const,
  };
}

export function controlledElement(
  elementId: string,
  value: unknown,
  policy?: { readRoles: string[]; writeRoles: string[] },
) {
  return {
    elementId,
    kind: "single" as const,
    value,
    valueDataType: "string",
    visibility: "controlled" as const,
    ...(policy ? { policy } : {}),
  };
}
