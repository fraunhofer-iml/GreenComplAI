import { expect, test, type Locator } from "@playwright/test";

// See passport-lifecycle.spec.ts: after every navigation the markup is present
// before React has hydrated.
async function clickUntil(trigger: Locator, expected: Locator): Promise<void> {
  await expect(async () => {
    await trigger.click({ timeout: 5_000 });
    await expect(expected).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 90_000 });
}

const API_ORIGIN = "http://localhost:3100";

// A passport often carries its data not at the top level but inside
// collections. Two reported bugs hinged on this: values were missing from the
// form, and elements were shown by their technical identifier. Both are
// rendering issues - unit tests cover the mapping, but whether the card in the
// browser actually shows "Stromversorgung" with "400VAC" is only visible here.
test("a passport's collection is shown as named fields, not as raw elements", async ({ page }) => {
  const runId = Date.now().toString(36);
  const repositoryKey = `e2e-coll-${runId}`;
  const namespaceUri = `https://dictionary.test/${repositoryKey}/2026.1/`;

  await page.goto("/login");
  await clickUntil(
    page.getByRole("button", { name: "Einladung erhalten? Konto erstellen" }),
    page.getByLabel("Name"),
  );
  await page.getByLabel("Name").fill("E2E Collections");
  await page.getByLabel("E-Mail").fill(`e2e-coll-${runId}@example.com`);
  await page.getByLabel("Passwort").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.waitForURL("**/dashboard");

  const orgResponse = await page.request.post(`${API_ORIGIN}/organizations`, {
    data: { name: `E2E Collections ${runId}`, slug: `e2e-coll-${runId}` },
  });
  const { organization } = (await orgResponse.json()) as {
    organization: { id: string };
  };
  const headers = { "x-organization-id": organization.id };

  await page.request.post(`${API_ORIGIN}/data-dictionary-repositories`, {
    headers,
    data: {
      repositoryKey,
      name: { de: "E2E Wörterbuch" },
      namespaceUri,
      version: "2026.1",
      status: "active",
    },
  });
  const entryResponse = await page.request.post(
    `${API_ORIGIN}/data-dictionary-repositories/${repositoryKey}/entries`,
    {
      headers,
      data: {
        entryKey: "powerSupply",
        canonicalUri: `${namespaceUri}powerSupply`,
        name: { de: "Stromversorgung" },
        valueType: "string",
        visibility: "public",
        required: false,
      },
    },
  );
  expect(entryResponse.ok()).toBe(true);

  const operatorResponse = await page.request.post(`${API_ORIGIN}/economic-operators`, {
    headers,
    data: {
      operatorId: `E2E-OP-${runId}`,
      legalName: "E2E Betreiber",
      roles: ["manufacturer"],
    },
  });
  expect(operatorResponse.ok()).toBe(true);

  // The passport carries its value **inside a collection**, and the element
  // has no name of its own - only the reference. This is exactly the
  // reported starting condition.
  const dppResponse = await page.request.post(`${API_ORIGIN}/dpps`, {
    headers,
    data: {
      productId: `E2E-PROD-${runId}`,
      granularity: "model",
      dppSchemaVersion: `${repositoryKey}/2026.1`,
      economicOperatorId: `E2E-OP-${runId}`,
      collections: [
        {
          elementId: "collection-electrical",
          kind: "collection",
          name: { de: "Elektrische Anschlusswerte" },
          visibility: "public",
          dataElements: [
            {
              elementId: "element-powerSupply",
              dictionaryReference: `${namespaceUri}powerSupply`,
              kind: "single",
              value: "400VAC",
              valueDataType: "string",
              visibility: "public",
            },
          ],
        },
      ],
    },
  });
  expect(dppResponse.ok()).toBe(true);
  const { dpp } = (await dppResponse.json()) as {
    dpp: { digitalProductPassportId: string };
  };
  const dppId = dpp.digitalProductPassportId;

  await page.evaluate((id) => {
    window.localStorage.setItem("dpp.activeOrganizationId", id);
  }, organization.id);

  await page.goto(`/dpps/${encodeURIComponent(dppId)}`);
  await clickUntil(
    page.getByRole("button", { name: "Bearbeiten" }),
    page.getByRole("button", { name: "Speichern" }),
  );

  // 1. The collection is shown by its name, not `collection-electrical`.
  await expect(page.getByText("Elektrische Anschlusswerte").first()).toBeVisible();

  // 2. The field carries the dictionary name and the stored value. It used to
  //    show `element-powerSupply` with an empty field next to it.
  const field = page.getByLabel("Stromversorgung");
  await expect(field).toBeVisible();
  await expect(field).toHaveValue("400VAC");

  // 3. The field count in the info column includes collections. It used to
  //    count only top-level fields - "0 Felder" for this passport even
  //    though it carries one.
  await expect(page.getByText(/1 Feld$/).first()).toBeVisible();

  // 4. And it appears in the left-hand navigation like any other group.
  await expect(page.getByRole("link", { name: /Elektrische Anschlusswerte/ })).toBeVisible();

  // 5. The part that would cost data: saving must hit **the same** element in
  //    the same collection - not create a second one alongside it and not
  //    lose the first.
  await field.fill("230VAC");
  await page.getByRole("button", { name: "Speichern" }).click();
  // Match the exact text: the "unsaved changes" hint sits nearby and would
  // satisfy a looser check without anything having been saved.
  await expect(page.getByText("Änderungen gespeichert.")).toBeVisible();

  const saved = await page.request.get(`${API_ORIGIN}/dpps/${encodeURIComponent(dppId)}`, {
    headers,
  });
  const { dpp: stored } = (await saved.json()) as {
    dpp: {
      collections: {
        dataElements: { elementId: string; value: unknown }[];
        elementId: string;
      }[];
      dataElements: unknown[];
    };
  };

  expect(stored.collections).toHaveLength(1);
  expect(stored.collections[0]?.dataElements).toEqual([
    expect.objectContaining({ elementId: "element-powerSupply", value: "230VAC" }),
  ]);
  // No duplicate at the top level.
  expect(stored.dataElements).toEqual([]);

  // 6. The header sticks: after scrolling down, "Speichern" must still be
  //    reachable. In a form this long that's the difference between
  //    "savable" and "scroll back up first".
  await page.mouse.wheel(0, 2000);
  // Without this check the next one would be worthless: on a page short
  // enough, the button would stay in view even without a sticky header.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await expect(page.getByRole("button", { name: "Speichern" })).toBeInViewport();
});
