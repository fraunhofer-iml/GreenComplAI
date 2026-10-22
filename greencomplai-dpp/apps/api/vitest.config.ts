import { defineConfig } from "vitest/config";

// Unit tests only: pure logic, no database, no server. Kept separate from the
// integration suite so `pnpm test` stays runnable without docker-compose up.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
