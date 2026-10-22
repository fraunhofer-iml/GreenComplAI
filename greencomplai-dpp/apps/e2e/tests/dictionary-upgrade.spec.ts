import { expect, test, type Locator } from "@playwright/test";

// See passport-lifecycle.spec.ts: after every navigation, the markup is
// present before React has hydrated.
async function clickUntil(trigger: Locator, expected: Locator): Promise<void> {
  await expect(async () => {
    await trigger.click({ timeout: 5_000 });
    await expect(expected).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 90_000 });
}

const API_ORIGIN = "http://localhost:3100";

// The question this grew out of: "I check ESRS E5, which creates a new
// dictionary version - how do I get my passport onto it?"
//
// Every stage is tested individually. That the path exists *as a path* - from
// the checkbox through the editor's notice to the filled-in new field - is
// only shown by this run.
test("a passport can be moved to the dictionary version an ESRS profile created", async ({
  page,
}) => {
  const runId = Date.now().toString(36);
  const repositoryKey = `e2e-upg-${runId}`;
  const namespaceUri = `https://dictionary.test/${repositoryKey}/2026.1/`;

  await page.goto("/login");
  await clickUntil(
    page.getByRole("button", { name: "Einladung erhalten? Konto erstellen" }),
    page.getByLabel("Name"),
  );
  await page.getByLabel("Name").fill("E2E Upgrade");
  await page.getByLabel("E-Mail").fill(`e2e-upg-${runId}@example.com`);
  await page.getByLabel("Passwort").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.waitForURL("**/dashboard");

  const orgResponse = await page.request.post(`${API_ORIGIN}/organizations`, {
    data: { name: `E2E Upgrade ${runId}`, slug: `e2e-upg-${runId}` },
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
  await page.request.post(`${API_ORIGIN}/data-dictionary-repositories/${repositoryKey}/entries`, {
    headers,
    data: {
      entryKey: "productName",
      canonicalUri: `${namespaceUri}productName`,
      name: { de: "Produktname" },
      valueType: "string",
      visibility: "public",
      required: false,
    },
  });
  await page.request.post(`${API_ORIGIN}/economic-operators`, {
    headers,
    data: {
      operatorId: `E2E-OP-${runId}`,
      legalName: "E2E Betreiber",
      roles: ["manufacturer"],
    },
  });

  const elements = [
    {
      elementId: "productName",
      dictionaryReference: `${namespaceUri}productName`,
      kind: "single",
      value: "Testanlage",
      valueDataType: "string",
      visibility: "public",
    },
  ];
  const dppResponse = await page.request.post(`${API_ORIGIN}/dpps`, {
    headers,
    data: {
      productId: `E2E-PROD-${runId}`,
      granularity: "model",
      dppSchemaVersion: `${repositoryKey}/2026.1`,
      economicOperatorId: `E2E-OP-${runId}`,
      dataElements: elements,
    },
  });
  const { dpp } = (await dppResponse.json()) as {
    dpp: { digitalProductPassportId: string };
  };
  const dppId = dpp.digitalProductPassportId;

  // Publish first: this pins the passport to version 2026.1, so the later
  // checkbox creates a copy instead of modifying the pinned version (G65).
  // Exactly the scenario from the question above.
  await page.request.put(`${API_ORIGIN}/dpps/${encodeURIComponent(dppId)}/status`, {
    headers,
    data: { status: "review" },
  });
  await page.request.put(`${API_ORIGIN}/dpps/${encodeURIComponent(dppId)}/status`, {
    headers,
    data: { status: "published" },
  });

  await page.evaluate((id) => {
    window.localStorage.setItem("dpp.activeOrganizationId", id);
  }, organization.id);

  // 1. The checkbox on the dictionary - the trigger.
  await page.goto(`/catalog/dictionaries/${repositoryKey}`);
  const save = page.getByRole("button", { name: "Auswahl speichern" });
  await clickUntil(
    page.getByText("E5 – Ressourcennutzung und Kreislaufwirtschaft"),
    save.and(page.locator(":not([disabled])")),
  );
  await save.click();
  // The new version is created because the old one is pinned.
  await expect(page.getByText(/neue Wörterbuchversion/)).toBeVisible();

  // 2. The passport still hangs off 2026.1 - and now says so on its own,
  //    already on the view page. Showing the notice only behind "Edit" would
  //    show it to someone who is already there anyway.
  await page.goto(`/dpps/${encodeURIComponent(dppId)}`);
  await expect(page.getByText("Neuere Wörterbuchversion verfügbar")).toBeVisible();
  // No button without a revision: a published passport is never upgraded in place.
  await expect(page.getByRole("button", { name: /umstellen/ })).toHaveCount(0);

  await clickUntil(
    page.getByRole("button", { name: "Neue Revision" }),
    page.getByRole("button", { name: "Bearbeiten" }),
  );
  await clickUntil(
    page.getByRole("button", { name: "Bearbeiten" }),
    page.getByRole("button", { name: "Speichern" }),
  );

  await expect(page.getByText("Neuere Wörterbuchversion verfügbar")).toBeVisible();
  // And the consequence is stated right there, not in a footnote.
  await expect(page.getByText(/Pflichtfeld/)).toBeVisible();

  // 3. Upgrade and save.
  await page.getByRole("button", { name: /Auf 2026.2 umstellen/ }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Änderungen gespeichert.")).toBeVisible();

  // 4. The point of the whole thing: the new fields are there and fillable.
  // After a reload, the view is shown again; the editor is a state of the
  // page, not its own route.
  await page.reload();
  await clickUntil(
    page.getByRole("button", { name: "Bearbeiten" }),
    page.getByRole("button", { name: "Speichern" }),
  );
  const field = page.getByLabel("Rezyklatanteil");
  await expect(field).toBeVisible();
  await field.fill("60");
  // Mass is also required in the E5 profile - without it there would be no
  // weighted share, and saving fails with "incomplete input". Exactly the
  // consequence the card above warned about.
  await page.getByLabel("Masse").fill("2");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Änderungen gespeichert.")).toBeVisible();

  const stored = await page.request.get(`${API_ORIGIN}/dpps/${encodeURIComponent(dppId)}`, {
    headers,
  });
  const { dpp: after } = (await stored.json()) as {
    dpp: {
      dataElements: { dictionaryReference?: string; value: unknown }[];
      dppSchemaVersion: string;
    };
  };

  expect(after.dppSchemaVersion).toBe(`${repositoryKey}/2026.2`);
  expect(after.dataElements).toContainEqual(
    expect.objectContaining({
      dictionaryReference: "https://data.europa.eu/dpp/recycledContentShare",
      value: 60,
    }),
  );
});
