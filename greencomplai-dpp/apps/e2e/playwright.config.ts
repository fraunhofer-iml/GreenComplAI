import { defineConfig, devices } from "@playwright/test";

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://dpp:dpp@localhost:5432/dpp_e2e";

// Deliberately NOT the dev ports (3000/5173). Sharing them would let Playwright
// attach to a developer's already-running `pnpm dev` — which carries the normal
// dev environment (invite-only signup, the real dev database) and turns this
// suite into a confusing failure that also writes test data into that database.
// Own ports mean the servers below are always the ones under test.
const API_PORT = 3100;
const WEB_PORT = 5273;
const API_ORIGIN = `http://localhost:${API_PORT}`;
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;

// The same relaxed posture as the API integration suite (see
// apps/api/vitest.integration.config.ts): open signup so the spec can register
// its own admin, and rate limiting off so the suite does not trip its own
// signup throttle.
const serverEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  ALLOW_OPEN_SIGNUP: "true",
  RATE_LIMIT_ENABLED: "false",
  BETTER_AUTH_SECRET: "e2e-test-secret-not-real",
  BETTER_AUTH_URL: API_ORIGIN,
  API_ORIGIN,
  WEB_ORIGIN,
  WEB_ORIGINS: WEB_ORIGIN,
  VITE_API_ORIGIN: API_ORIGIN,
  S3_BUCKET: "dpp-e2e",
};

export default defineConfig({
  // The whole acceptance path in one test, against dev servers that may still be
  // compiling: the 30s default is for a single interaction, not for this.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  testDir: "./tests",
  // One user, one org, one DPP walked through the whole workflow in a single
  // spec: parallel workers would just race each other over the same rows.
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: WEB_ORIGIN,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @dpp/api dev",
      url: `${API_ORIGIN}/health`,
      stdout: "pipe",
      stderr: "pipe",
      // Never reuse: a server already on this port was not started with the env
      // above, and testing against the wrong configuration is worse than paying
      // the boot cost.
      reuseExistingServer: false,
      timeout: 240_000,
      env: { ...serverEnv, PORT: String(API_PORT) },
    },
    {
      command: `pnpm --filter web dev --port ${WEB_PORT}`,
      url: WEB_ORIGIN,
      stdout: "pipe",
      stderr: "pipe",
      reuseExistingServer: false,
      timeout: 240_000,
      env: serverEnv,
    },
  ],
});
