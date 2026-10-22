import { expect, test, type Locator } from "@playwright/test";

// See passport-lifecycle.spec.ts: after every navigation the markup is there
// before React has hydrated.
async function clickUntil(trigger: Locator, expected: Locator): Promise<void> {
  await expect(async () => {
    await trigger.click({ timeout: 5_000 });
    await expect(expected).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 90_000 });
}

const API_ORIGIN = "http://localhost:3100";

// The path the ESRS profiles are about: a checkbox on the dictionary should
// create the data points that become fields in the passport. Each step is
// API-tested on its own - only a click shows that the card in the browser
// really does what it promises.
test("an ESRS requirement can be switched on and creates the datapoints", async ({ page }) => {
  const runId = Date.now().toString(36);
  const repositoryKey = `e2e-esrs-${runId}`;

  await page.goto("/login");
  await clickUntil(
    page.getByRole("button", { name: "Einladung erhalten? Konto erstellen" }),
    page.getByLabel("Name"),
  );
  await page.getByLabel("Name").fill("E2E ESRS");
  await page.getByLabel("E-Mail").fill(`e2e-esrs-${runId}@example.com`);
  await page.getByLabel("Passwort").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.waitForURL("**/dashboard");

  // Organization and dictionary via API: neither has a UI for creation yet
  // (organization: G50, dictionary: known gap).
  const orgResponse = await page.request.post(`${API_ORIGIN}/organizations`, {
    data: { name: `E2E ESRS ${runId}`, slug: `e2e-esrs-${runId}` },
  });
  const { organization } = (await orgResponse.json()) as { organization: { id: string } };

  const repositoryResponse = await page.request.post(`${API_ORIGIN}/data-dictionary-repositories`, {
    headers: { "x-organization-id": organization.id },
    data: {
      repositoryKey,
      name: { de: "E2E Wörterbuch" },
      namespaceUri: `https://dictionary.test/${repositoryKey}/2026.1/`,
      version: "2026.1",
      status: "active",
    },
  });
  expect(repositoryResponse.ok()).toBe(true);

  await page.evaluate((id) => {
    window.localStorage.setItem("dpp.activeOrganizationId", id);
  }, organization.id);

  await page.goto(`/catalog/dictionaries/${repositoryKey}`);
  // By text, not by role: `CardTitle` renders a `<div>` instead of a heading,
  // so the app's cards have no outline for screen readers. Noted as an open
  // a11y issue (G44), not fixed here in passing since it would affect every
  // card in the app.
  await expect(page.getByText("Nachhaltigkeitsberichterstattung (ESRS)")).toBeVisible();

  // "Provisional" is a visible marker, not hidden in a footnote.
  await expect(page.getByText("vorläufig").first()).toBeVisible();

  const save = page.getByRole("button", { name: "Auswahl speichern" });
  // Nothing to save without a change.
  await expect(save).toBeDisabled();

  await clickUntil(
    page.getByText("E5 – Ressourcennutzung und Kreislaufwirtschaft"),
    save.and(page.locator(":not([disabled])")),
  );
  await save.click();
  await expect(page.getByText(/Gespeichert —/)).toBeVisible();

  // And the point: the data points are now in the dictionary.
  await page.reload();
  await expect(page.getByText("Rezyklatanteil").first()).toBeVisible();
  await expect(page.getByText("Kreislaufwirtschaft (ESRS E5)").first()).toBeVisible();
});
