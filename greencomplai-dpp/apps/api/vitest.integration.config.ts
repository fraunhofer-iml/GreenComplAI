import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://dpp:dpp@localhost:5432/dpp_test";
const TEST_S3_ENDPOINT = process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000";

// Integration tests drive the real Hono app against real Postgres and MinIO:
// `docker compose up -d postgres minio`. global-setup.ts creates and migrates a
// throwaway database and the storage bucket.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // One database, shared state: run files sequentially rather than fight over
    // it. The suite is small enough that the wall-clock cost is not worth the
    // isolation machinery.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
      BETTER_AUTH_SECRET: "integration-test-secret-not-a-real-one",
      BETTER_AUTH_URL: "http://localhost:3000",
      API_ORIGIN: "http://localhost:3000",
      WEB_ORIGIN: "http://localhost:5173",
      // Without this key the platform rejects any connector that carries a
      // secret - the connector test checks, among other things, that it is
      // stored encrypted, and needs the key set for that.
      CONNECTOR_SECRET_KEY: "Y29ubmVjdG9yLXRlc3Qta2V5LTMyLWJ5dGVzISEhISE=",
      // Fixtures create many users; the sign-up tier (15/min) would throttle the
      // suite itself. Rate limiting has its own unit-level coverage.
      RATE_LIMIT_ENABLED: "false",
      // Open by default so fixtures can mint users directly. The invite-only
      // test flips `env.ALLOW_OPEN_SIGNUP` at runtime to cover the closed mode.
      ALLOW_OPEN_SIGNUP: "true",
      // Uploads run against the local MinIO, so the document flow is exercised
      // end to end rather than mocked at the storage boundary.
      S3_ENDPOINT: TEST_S3_ENDPOINT,
      S3_BUCKET: "dpp-test",
      S3_ACCESS_KEY_ID: "minio",
      S3_SECRET_ACCESS_KEY: "minio123",
      S3_REGION: "local",
    },
  },
});
