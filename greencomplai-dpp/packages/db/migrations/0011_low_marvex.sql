-- Backfill before dropping. products.identifiers and product_identifiers stored
-- the same fact twice; createProduct wrote both, but patchProductByBusinessId
-- wrote them in two unguarded statements, so a failure between them could leave
-- a value in the jsonb column that never reached the table. Dropping the column
-- without reconciling would delete exactly those.
--
-- Only pairs the table does not already have are inserted, and only keys that
-- name a real identifier type — the jsonb column carried no constraint, so it
-- may hold anything.
INSERT INTO "product_identifiers" ("product_id", "identifier_type", "identifier_value")
SELECT
  p."id",
  kv.key::"product_identifier_type",
  kv.value #>> '{}'
FROM "products" AS p
CROSS JOIN LATERAL jsonb_each(p."identifiers") AS kv(key, value)
WHERE p."identifiers" IS NOT NULL
  AND jsonb_typeof(p."identifiers") = 'object'
  AND kv.key = ANY (enum_range(NULL::"product_identifier_type")::text[])
  AND kv.value #>> '{}' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "product_identifiers" AS existing
    WHERE existing."product_id" = p."id"
      AND existing."identifier_type" = kv.key::"product_identifier_type"
  );--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "identifiers";
