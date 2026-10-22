import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

// Lightweight connectivity check for readiness probes.
export async function pingDatabase(db: Database) {
  await db.execute(sql`select 1`);
}
export { schema };
export * from "./repositories/catalog.js";
export * from "./repositories/connectors.js";
export * from "./repositories/dpps.js";
export * from "./repositories/blobs.js";
export * from "./repositories/memberships.js";
export * from "./repositories/service-accounts.js";
export * from "./repositories/organizations.js";
export * from "./repositories/relationships.js";
