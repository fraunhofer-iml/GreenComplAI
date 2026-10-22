import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

// Applies every pending migration in file order, inside one transaction each.
// Exported as a function (rather than only living in the CLI script) so tests
// can bring a throwaway database up to the current schema in-process.
export async function runMigrations(databaseUrl: string): Promise<string[]> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  const applied: string[] = [];

  try {
    await sql`
      create table if not exists dpp_migrations (
        id text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `;

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      const id = file.replace(/\.sql$/, "");
      const content = await readFile(join(migrationsDir, file), "utf8");
      const checksum = createHash("sha256").update(content).digest("hex");
      const [existing] = await sql<{ checksum: string }[]>`
        select checksum from dpp_migrations where id = ${id}
      `;

      if (existing) {
        // An already applied migration whose file changed would leave the schema
        // silently diverged from the code — refuse rather than guess.
        if (existing.checksum !== checksum) {
          throw new Error(`Migration ${id} checksum mismatch`);
        }
        continue;
      }

      const statements = content
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      await sql.begin(async (tx) => {
        for (const statement of statements) {
          await tx.unsafe(statement);
        }

        await tx`
          insert into dpp_migrations (id, checksum)
          values (${id}, ${checksum})
        `;
      });

      applied.push(id);
    }
  } finally {
    await sql.end();
  }

  return applied;
}
