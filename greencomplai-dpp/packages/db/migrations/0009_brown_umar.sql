DROP INDEX "data_dictionary_entries_canonical_uri_idx";--> statement-breakpoint
DROP INDEX "data_dictionary_repositories_org_key_idx";--> statement-breakpoint
DROP INDEX "data_dictionary_entries_org_entry_key_idx";--> statement-breakpoint
ALTER TABLE "dpp_versions" ADD COLUMN "version_label" text;--> statement-breakpoint
ALTER TABLE "dpps" ADD COLUMN "version_label" text;--> statement-breakpoint
-- Backfill the revision labels (G63). Existing history predates the concept: a
-- version row was written on every save, so the rows cannot be grouped into
-- revisions retroactively. Each legacy row therefore gets its own label, formed
-- from its creation year and its rank within that year. New revisions from here
-- on group correctly, and nextVersionLabel() continues off the highest sequence.
UPDATE "dpp_versions" AS v
SET "version_label" = ranked.label
FROM (
  SELECT
    "id",
    extract(year FROM "created_at")::int || '.' ||
      row_number() OVER (
        PARTITION BY "dpp_id", extract(year FROM "created_at")
        ORDER BY "version_number"
      ) AS label
  FROM "dpp_versions"
) AS ranked
WHERE v."id" = ranked."id" AND v."version_label" IS NULL;--> statement-breakpoint
-- The DPP's open revision inherits the label of its most recent version row;
-- a DPP without any version row falls back to <current year>.1.
UPDATE "dpps" AS d
SET "version_label" = coalesce(
  (
    SELECT v."version_label"
    FROM "dpp_versions" AS v
    WHERE v."dpp_id" = d."id"
    ORDER BY v."version_number" DESC
    LIMIT 1
  ),
  extract(year FROM now())::int || '.1'
)
WHERE d."version_label" IS NULL;--> statement-breakpoint
ALTER TABLE "dpp_versions" ALTER COLUMN "version_label" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dpps" ALTER COLUMN "version_label" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "data_dictionary_entries_repository_canonical_uri_idx" ON "data_dictionary_entries" USING btree ("repository_id","canonical_uri");--> statement-breakpoint
CREATE UNIQUE INDEX "data_dictionary_repositories_org_key_version_idx" ON "data_dictionary_repositories" USING btree ("organization_id","repository_key","version");--> statement-breakpoint
CREATE INDEX "data_dictionary_entries_org_entry_key_idx" ON "data_dictionary_entries" USING btree ("organization_id","entry_key");
