import { expect, test, type Locator, type Page } from "@playwright/test";

// Every page here is server-rendered by TanStack Start: the markup - buttons
// included - is on screen and clickable well before React has hydrated and
// attached its handlers. A click in that window hits inert markup and does
// nothing at all, with no error to notice. So the FIRST interaction after any
// navigation must retry until it visibly takes effect. On a cold Vite dev server
// that window is tens of seconds, not milliseconds.
async function clickUntil(trigger: Locator, expected: Locator): Promise<void> {
  await expect(async () => {
    await trigger.click({ timeout: 5_000 });
    await expect(expected).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 90_000 });
}

// This spec drives the acceptance path end to end through the real browser
// UI: signup, org bootstrap, draft authoring, review, publish, and the public
// viewer. It is the one browser-level check that the unit/integration suites
// (apps/api/test) cannot give us, because those drive the API in-process and
// never render a page.
//
// The web app has no UI (yet) to create an organization, an economic
// operator, or a dictionary repository/entry - those are catalog admin
// screens that -Follow-up did not build. Without at least one operator and
// one dictionary repository, the "DPP Draft erstellen" dialog has nothing to
// select and can never submit. So this spec creates that catalog data via
// direct API calls (through `page.request`, which shares the signed-in
// browser context's session cookie) and only drives the parts of the flow
// that actually have a UI.
// Must match playwright.config.ts, which deliberately keeps the E2E servers
// off the dev ports.
const API_ORIGIN = "http://localhost:3100";

test("a published DPP shows its status in the app and its public data on the public viewer", async ({
  page,
  browser,
}) => {
  // Unique per run so re-runs against a non-reset database (a developer
  // running this locally without recreating dpp_e2e) don't collide on the
  // org slug / operator id / user email.
  const runId = Date.now().toString(36);
  const adminEmail = `e2e-admin-${runId}@example.com`;
  const adminPassword = "correct horse battery staple"; // >= 12 chars, per the signup form's minLength
  const orgSlug = `e2e-org-${runId}`;
  const operatorId = `E2E-OP-${runId}`;
  const repositoryKey = `e2e-dictionary-${runId}`;
  const productId = `E2E-PRODUCT-${runId}`;
  // The one public datapoint the test fills in and later expects to see again
  // on the anonymous public viewer.
  const publicFieldValue = `Recyclinganteil ${runId}%`;

  // --- Sign up a fresh admin through the real login page -------------------
  await page.goto("/login");
  await clickUntil(
    page.getByRole("button", { name: "Einladung erhalten? Konto erstellen" }),
    page.getByLabel("Name"),
  );
  await page.getByLabel("Name").fill("E2E Admin");
  await page.getByLabel("E-Mail").fill(adminEmail);
  await page.getByLabel("Passwort").fill(adminPassword);
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.waitForURL("**/dashboard");

  // --- Bootstrap tenant + catalog data via the API --------------------------
  // No UI exists for any of this, so it goes straight to the API. The
  // browser's session cookie (set by the signup above) travels automatically
  // because page.request shares the page's cookie jar.
  const orgResponse = await page.request.post(`${API_ORIGIN}/organizations`, {
    data: { name: `E2E Org ${runId}`, slug: orgSlug },
  });
  expect(orgResponse.ok()).toBe(true);
  const { organization } = (await orgResponse.json()) as {
    organization: { id: string };
  };
  const organizationId = organization.id;

  const orgHeaders = { "x-organization-id": organizationId };

  const operatorResponse = await page.request.post(`${API_ORIGIN}/economic-operators`, {
    headers: orgHeaders,
    data: {
      operatorId,
      legalName: `E2E Operator GmbH ${runId}`,
      roles: ["manufacturer"],
    },
  });
  expect(operatorResponse.ok()).toBe(true);

  const repositoryResponse = await page.request.post(`${API_ORIGIN}/data-dictionary-repositories`, {
    headers: orgHeaders,
    data: {
      repositoryKey,
      name: { de: `E2E Dictionary ${runId}` },
      namespaceUri: `https://example.com/dictionaries/e2e-${runId}`,
      version: "1.0.0",
      status: "active",
    },
  });
  expect(repositoryResponse.ok()).toBe(true);
  const { repository } = (await repositoryResponse.json()) as {
    repository: { repositoryKey: string; version: string };
  };

  // A public, optional, string entry: optional so submit-review/publish never
  // gets blocked on a missing required datapoint, and public so it lands in the
  // anonymous public viewer once published. It deliberately carries no
  // `presentation: "metric"` hint - the public API strips internalDisplay, so an
  // element that only renders when grouped as a metric would be invisible there.
  // Rendering it without that hint is exactly what this spec has to prove.
  const entryResponse = await page.request.post(
    `${API_ORIGIN}/data-dictionary-repositories/${repositoryKey}/entries`,
    {
      headers: orgHeaders,
      data: {
        entryKey: `e2e-recycled-content-${runId}`,
        name: { de: "Rezyklatanteil" },
        valueType: "string",
        required: false,
        visibility: "public",
      },
    },
  );
  expect(entryResponse.ok()).toBe(true);

  // Make the freshly created org the active tenant for the browser client
  // (see organization-store.ts): nothing does this automatically after a
  // direct API create, only the (nonexistent) org-switcher UI does.
  await page.evaluate((id) => {
    window.localStorage.setItem("dpp.activeOrganizationId", id);
  }, organizationId);
  await page.reload();

  // --- Create the DPP draft via the dashboard dialog ------------------------
  await clickUntil(
    page.getByRole("button", { name: "DPP Draft erstellen" }),
    page.getByPlaceholder("z. B. ERP-12345 oder GTIN-..."),
  );
  await page.getByLabel("Produkt-ID").fill(productId);
  // By label, not by placeholder text: since `Field` gives its children a
  // shared identifier, the controls have an accessible name. Previously this
  // spec had to recognize them by placeholder instead.
  await page.getByLabel("Wirtschaftsakteur").click();
  await page.getByRole("option", { name: new RegExp(operatorId) }).click();
  await page.getByLabel("Dictionary").click();
  await page.getByRole("option", { name: new RegExp(repository.repositoryKey) }).click();
  await page.getByRole("button", { name: "Draft erstellen" }).click();
  await page.getByRole("link", { name: "Neuen DPP öffnen" }).click();
  await page.waitForURL("**/dpps/**");

  // --- Fill in the one public field before submitting for review -----------
  // Publishing is only reachable from a draft, and editing is only possible
  // while the DPP is still a draft, so this has to happen before submit-review.
  await clickUntil(
    page.getByRole("button", { name: "Bearbeiten" }),
    page.getByLabel("Rezyklatanteil"),
  );
  await page.getByLabel("Rezyklatanteil").fill(publicFieldValue);
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Änderungen gespeichert.")).toBeVisible();
  await page.getByRole("button", { name: "Bearbeitung beenden" }).click();

  // --- Submit for review, then publish (four-eyes workflow) -----------------
  // Both the workflow-card button and the confirmation dialog's footer button
  // share the same label, so the dialog interactions are scoped to the dialog
  // to avoid Playwright's strict-mode ambiguity between the two.
  await page.getByRole("button", { name: "Zur Prüfung einreichen" }).click();
  const reviewDialog = page.getByRole("dialog");
  await reviewDialog.getByRole("button", { name: "Zur Prüfung einreichen" }).click();
  await expect(reviewDialog).not.toBeVisible();

  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  const publishDialog = page.getByRole("dialog");
  // The publish action is gated on the hard completeness validator (G4); wait
  // for it to resolve and unblock the confirm button before clicking it.
  const publishConfirm = publishDialog.getByRole("button", {
    name: "Veröffentlichen",
  });
  await expect(publishConfirm).toBeEnabled();
  await publishConfirm.click();
  await expect(publishDialog).not.toBeVisible();

  // --- Assert the detail header now shows both the published pill and the
  // version label (G62/G63) --------------------------------------------------
  const identityHeader = page.getByRole("heading", { level: 1, name: productId }).locator("..");
  await expect(identityHeader.getByText("Veröffentlicht")).toBeVisible();
  // Version labels are "{year}.{sequence}" (G63); the exact sequence depends
  // on how many DPPs this fresh org has published before, so match the shape
  // rather than a hardcoded value.
  await expect(identityHeader.getByText(/^\d{4}\.\d+$/)).toBeVisible();

  const publicId = page.url().split("/").pop();
  expect(publicId).toBeTruthy();

  // --- Open the public viewer in a brand new, unauthenticated context ------
  const anonymousContext = await browser.newContext();
  const publicPage = await anonymousContext.newPage();
  await publicPage.goto(`/dpp/${publicId}`);

  await expect(publicPage.getByText("Veröffentlicht")).toBeVisible();
  await expect(publicPage.getByRole("heading", { level: 1, name: productId })).toBeVisible();
  await expect(publicPage.getByText(publicFieldValue)).toBeVisible();

  await anonymousContext.close();
});
