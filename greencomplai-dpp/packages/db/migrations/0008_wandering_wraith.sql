ALTER TABLE "dpps" ADD COLUMN "public_id" text;--> statement-breakpoint
-- Backfill existing rows. The value must satisfy the application's public-id
-- rule (exactly 12 characters from the Base58 alphabet), otherwise the route
-- lookup would classify it as a URN and never find the row. Derived from the
-- row's own uuid via md5, so it is deterministic and unique per row without
-- needing pgcrypto or a volatile expression the planner might hoist.
UPDATE "dpps" AS d
SET "public_id" = (
  SELECT string_agg(
    substr(
      '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
      1 + (('x' || substr(md5(d."id"::text), 1 + 2 * g.i, 2))::bit(8)::int % 58),
      1
    ),
    '' ORDER BY g.i
  )
  FROM generate_series(0, 11) AS g(i)
)
WHERE d."public_id" IS NULL;--> statement-breakpoint
ALTER TABLE "dpps" ALTER COLUMN "public_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dpps_public_id_idx" ON "dpps" USING btree ("public_id");
