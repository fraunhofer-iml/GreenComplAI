import { expect, test, type Locator, type Page } from "@playwright/test";

// See passport-lifecycle.spec.ts: after every navigation the markup is there
// before React has hydrated - the first click must therefore be retried until
// it takes visible effect.
async function clickUntil(trigger: Locator, expected: Locator): Promise<void> {
  await expect(async () => {
    await trigger.click({ timeout: 5_000 });
    await expect(expected).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 90_000 });
}

const API_ORIGIN = "http://localhost:3100";

// Master data was only maintainable via the API until products had no UI
// at all, a facility was a free-text field with no matching record. This spec
// drives both through the real UI and then checks what it's all for - that a
// passport's create dialog offers the maintained master data instead of
// leaving the editor to guess.
test("master data can be maintained in the UI and is offered when a passport is created", async ({
  page,
}) => {
  const runId = Date.now().toString(36);
  const adminEmail = `e2e-catalog-${runId}@example.com`;
  const adminPassword = "correct horse battery staple";
  const operatorId = `E2E-OP-${runId}`;
  const productId = `E2E-PRODUKT-${runId}`;
  const facilityId = `E2E-WERK-${runId}`;

  await page.goto("/login");
  await clickUntil(
    page.getByRole("button", { name: "Einladung erhalten? Konto erstellen" }),
    page.getByLabel("Name"),
  );
  await page.getByLabel("Name").fill("E2E Katalog");
  await page.getByLabel("E-Mail").fill(adminEmail);
  await page.getByLabel("Passwort").fill(adminPassword);
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.waitForURL("**/dashboard");

  // Only the organization via API: there is still no UI for that (G50). The
  // economic operator below is created through the form - that was the gap
  // where a fresh organization couldn't reach a single passport because the
  // operator is a required field.
  const orgResponse = await page.request.post(`${API_ORIGIN}/organizations`, {
    data: { name: `E2E Katalog ${runId}`, slug: `e2e-katalog-${runId}` },
  });
  expect(orgResponse.ok()).toBe(true);
  const { organization } = (await orgResponse.json()) as { organization: { id: string } };

  await page.evaluate((id) => {
    window.localStorage.setItem("dpp.activeOrganizationId", id);
  }, organization.id);

  // --- Create economic operator through the UI ------------------------------
  await page.goto("/catalog/operators");
  await clickUntil(
    page.getByRole("button", { name: "Wirtschaftsakteur anlegen" }),
    page.getByRole("dialog").getByLabel("Akteur-ID"),
  );
  const operatorDialog = page.getByRole("dialog");
  await operatorDialog.getByLabel("Akteur-ID").fill(operatorId);
  await operatorDialog.getByLabel("Firmenname").fill(`E2E Betreiber ${runId}`);
  await operatorDialog.getByLabel("Ort", { exact: true }).fill("Dortmund");
  await operatorDialog.getByRole("button", { name: "Anlegen", exact: true }).click();

  // Scoped to the row: "Hersteller" also appears in the dialog's checkboxes
  // and in the page description.
  const operatorRow = page.getByRole("row").filter({ hasText: operatorId });
  await expect(operatorRow.getByText("Hersteller")).toBeVisible();

  // --- Create product through the UI -----------------------------------------
  await page.goto("/catalog/products");
  await clickUntil(
    page.getByRole("button", { name: "Produkt anlegen" }),
    page.getByRole("dialog").getByLabel("Produkt-ID"),
  );
  const productDialog = page.getByRole("dialog");
  await productDialog.getByLabel("Produkt-ID").fill(productId);
  await productDialog.getByLabel("Name", { exact: true }).fill("Stadtrad 28 Zoll");
  await productDialog.getByLabel("Kategorie").fill("Fahrrad");
  // Identifiers: previously not maintainable at all, because the read and
  // write forms diverged. Two batches prove that several identifiers of the
  // same type pass through - which the old map shape couldn't do structurally.
  await productDialog.getByRole("button", { name: "Kennung hinzufügen" }).click();
  await productDialog.getByLabel("Wert der 1. Kennung").fill("04012345678901");
  await productDialog.getByLabel("Ausgebende Stelle der 1. Kennung").fill("GS1");
  await productDialog.getByRole("button", { name: "Kennung hinzufügen" }).click();
  await productDialog.getByLabel("Typ der 2. Kennung").click();
  await page.getByRole("option", { name: "Charge", exact: true }).click();
  await productDialog.getByLabel("Wert der 2. Kennung").fill("CHARGE-A");
  await productDialog.getByRole("button", { name: "Anlegen", exact: true }).click();

  await expect(page.getByRole("link", { name: productId })).toBeVisible();
  await expect(page.getByText("Stadtrad 28 Zoll")).toBeVisible();
  await expect(page.getByText("gtin: 04012345678901")).toBeVisible();
  await expect(page.getByText("batch: CHARGE-A")).toBeVisible();

  // --- Edit identifiers afterwards --------------------------------------------
  await page.getByRole("link", { name: productId }).click();
  await page.waitForURL("**/catalog/products/**");
  await expect(page.getByRole("button", { name: "Kennungen speichern" })).toBeVisible();
  await page.getByLabel("2. Kennung entfernen").click();
  await page.getByRole("button", { name: "Kennungen speichern" }).click();
  // Assert the save confirmation rather than the permanently visible helper text.
  await expect(page.getByText("Gespeichert.", { exact: true })).toBeVisible();

  // --- Create facility through the UI -----------------------------------------
  await page.goto("/catalog/facilities");
  await clickUntil(
    page.getByRole("button", { name: "Standort anlegen" }),
    page.getByRole("dialog").getByLabel("Standortkennung"),
  );
  const facilityDialog = page.getByRole("dialog");
  await facilityDialog.getByLabel("Standortkennung").fill(facilityId);
  await facilityDialog.getByLabel("Name", { exact: true }).fill("Werk Nord");
  await facilityDialog.getByRole("button", { name: "Anlegen", exact: true }).click();

  await expect(page.getByRole("link", { name: facilityId })).toBeVisible();
  await expect(page.getByText("Werk Nord")).toBeVisible();

  // --- And the point of the exercise: both are offered in the create dialog --
  await page.goto("/dashboard");
  await clickUntil(
    page.getByRole("button", { name: "DPP Draft erstellen" }),
    page.getByPlaceholder("z. B. ERP-12345 oder GTIN-..."),
  );

  // The facility is a select field because a named facility must exist (G21)
  // - a typo would otherwise only surface on save.
  await page.getByRole("combobox").filter({ hasText: "Kein Standort" }).click();
  await expect(page.getByRole("option", { name: new RegExp(facilityId) })).toBeVisible();
  await page.getByRole("option", { name: new RegExp(facilityId) }).click();

  // The product id stays a text field with suggestions: a passport may carry
  // an identifier for which no master data record exists yet. That the list
  // is populated can only be checked in the DOM - a `datalist` is not visible
  // to Playwright.
  // Via the `value` attribute, not the text: an option's visible text is the
  // product name, but the identifier is what gets entered.
  await expect(page.locator(`datalist option[value="${productId}"]`)).toHaveCount(1);
});
