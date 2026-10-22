import { expect, test } from "@playwright/test";

const host = process.env.SMOKE_HOST ?? "localhost";
const apiOrigin = `http://${host}:${process.env.SMOKE_API_PORT ?? "13000"}`;

// Capture browser failures even when the server responds with HTTP 200.
function collectFailures(page: import("@playwright/test").Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown";
    // Ignore optional external fonts in environments without internet access.
    if (new URL(request.url()).host === new URL(page.url() || `http://${host}`).host) {
      failures.push(`requestfailed: ${request.url()} (${reason})`);
    }
  });
  return failures;
}

test("the API reports readiness", async ({ request }) => {
  const ready = await request.get(`${apiOrigin}/ready`);
  expect(ready.status(), await ready.text()).toBe(200);
});

test("the built image renders the login page", async ({ page }) => {
  const failures = collectFailures(page);

  await page.goto("/login");

  // The error boundary can return HTTP 200, so assert the rendered content.
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await expect(page.getByLabel("E-Mail")).toBeVisible();
  await expect(page.getByLabel("Passwort")).toBeVisible();
  await expect(page.getByRole("button", { name: "Einloggen" })).toBeVisible();

  expect(failures, failures.join("\n")).toEqual([]);
});

test("the browser reaches the configured API origin", async ({ page }) => {
  await page.goto("/login");

  // The server must inject the deployment origin instead of the local fallback.
  const injected = await page.evaluate(() => globalThis.__DPP_API_ORIGIN__);
  expect(injected).toBe(apiOrigin);

  // An application-level rejection proves that both API access and CORS work.
  await page.getByLabel("E-Mail").fill("niemand@example.com");
  await page.getByLabel("Passwort").fill("FalschesPasswort123");
  await page.getByRole("button", { name: "Einloggen" }).click();

  await expect(page.getByText("E-Mail oder Passwort ist nicht korrekt.")).toBeVisible();
});

test("the public passport is accessible without authentication", async ({ page }) => {
  const failures = collectFailures(page);

  await page.goto("/p/gibt-es-nicht");

  // An unknown product should render the viewer's unavailable state, not crash.
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await expect(page.getByText("Produktpass nicht verfügbar")).toBeVisible();

  expect(failures, failures.join("\n")).toEqual([]);
});
