import { runMigrations } from "./migrations.js";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://dpp:dpp@localhost:5432/dpp";

const applied = await runMigrations(databaseUrl);

for (const id of applied) {
  console.log(`Applied migration ${id}`);
}
if (applied.length === 0) {
  console.log("No pending migrations");
}
