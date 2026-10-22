// Capture the real UI with fictional demo data for the user guide.
// See README.md for the isolated setup and environment overrides.

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:18080";
const email = process.env.LOGIN_EMAIL ?? "admin@example.com";
const password = process.env.LOGIN_PASSWORD ?? "EinLangesPasswort1!";
const outDir = process.env.OUT_DIR ?? resolve(repoRoot, "docs/screenshots");

const shots = [
  { name: "dashboard", path: "/dashboard" },
  { name: "dictionaries", path: "/catalog/dictionaries" },
  { name: "products", path: "/catalog/products" },
  { name: "economic-operators", path: "/catalog/operators" },
  { name: "passports", path: "/dpps" },
  { name: "connectors", path: "/connectors" },
  { name: "team", path: "/team" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "de-DE",
  colorScheme: "light",
});
const page = await context.newPage();

// Capture the signed-out state before logging in.
await page.goto(`${webOrigin}/login`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${outDir}/login.png` });

await page.getByLabel("E-Mail").fill(email);
await page.getByLabel("Passwort").fill(password);
await page.getByRole("button", { name: "Einloggen" }).click();
await page.waitForURL("**/dashboard", { timeout: 30_000 });

for (const shot of shots) {
  await page.goto(`${webOrigin}${shot.path}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${shot.name}.png` });
  console.log(`${shot.name} <- ${shot.path}`);
}

// Resolve detail links from the current list.
async function firstLink(listPath, pattern) {
  await page.goto(`${webOrigin}${listPath}`);
  await page.waitForLoadState("networkidle");
  const href = await page.locator(`a[href*="${pattern}"]`).first().getAttribute("href");
  return href;
}

const dictionaryHref = await firstLink("/catalog/dictionaries", "/catalog/dictionaries/");
if (dictionaryHref) {
  await page.goto(`${webOrigin}${dictionaryHref}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/dictionary-detail.png` });
  console.log(`dictionary-detail <- ${dictionaryHref}`);
}

// Prefer the example unit, whose detail page also shows identifiers and files.
const productHref = await firstLink("/catalog/products", "/catalog/products/DEMO-UNIT-01");
let productDppHref;
if (productHref) {
  await page.goto(`${webOrigin}${productHref}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/product-detail.png`, fullPage: true });
  productDppHref = await page.locator('a[href^="/dpps/"]').first().getAttribute("href");
  console.log(`produkt-detail <- ${productHref}`);
}

const dppHref = productDppHref ?? (await firstLink("/dpps", "/dpps/"));
let publicHref;
if (dppHref) {
  await page.goto(`${webOrigin}${dppHref}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  publicHref = await page.getByRole("link", { name: "Öffentlicher DPP" }).getAttribute("href");
  await page.screenshot({ path: `${outDir}/passport-detail.png` });
  console.log(`produktpass-detail <- ${dppHref}`);
}

// Capture the public passport in an anonymous browser context.
if (publicHref) {
  const anon = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "de-DE",
    colorScheme: "light",
  });
  const anonPage = await anon.newPage();
  await anonPage.goto(new URL(publicHref, webOrigin).href);
  await anonPage.waitForLoadState("networkidle");
  await anonPage.waitForTimeout(900);
  if (await anonPage.getByText("Produktpass nicht verfügbar").isVisible()) {
    throw new Error("The public screenshot must show a published demo passport, not an error.");
  }
  await anonPage.screenshot({ path: `${outDir}/public-passport.png` });
  console.log(`oeffentlicher-pass <- ${publicHref}`);
  await anon.close();
}

await browser.close();
console.log(`\nDone: ${outDir}`);
