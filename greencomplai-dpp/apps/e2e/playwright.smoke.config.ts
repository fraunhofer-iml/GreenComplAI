import { defineConfig, devices } from "@playwright/test";

// Test built images, including asset delivery and runtime configuration.
// scripts/smoke.sh owns the isolated Compose stack.
const host = process.env.SMOKE_HOST ?? "localhost";
const webPort = process.env.SMOKE_WEB_PORT ?? "18080";

export default defineConfig({
  testDir: "./smoke",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? "list" : "list",
  use: {
    baseURL: `http://${host}:${webPort}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
