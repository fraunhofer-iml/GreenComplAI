CREATE TYPE "public"."repository_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TABLE "data_dictionary_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"repository_key" text NOT NULL,
	"name" jsonb NOT NULL,
	"namespace_uri" text NOT NULL,
	"version" text NOT NULL,
	"publisher" text,
	"status" "repository_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_dictionary_entries" ADD COLUMN "repository_id" uuid;--> statement-breakpoint
ALTER TABLE "data_dictionary_entries" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "data_dictionary_entries" ADD COLUMN "canonical_uri" text;--> statement-breakpoint
ALTER TABLE "data_dictionary_entries" ADD COLUMN "version" text;--> statement-breakpoint
ALTER TABLE "data_dictionary_repositories" ADD CONSTRAINT "data_dictionary_repositories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_dictionary_repositories_org_key_idx" ON "data_dictionary_repositories" USING btree ("organization_id","repository_key");--> statement-breakpoint
CREATE UNIQUE INDEX "data_dictionary_repositories_namespace_version_idx" ON "data_dictionary_repositories" USING btree ("namespace_uri","version");--> statement-breakpoint
ALTER TABLE "data_dictionary_entries" ADD CONSTRAINT "data_dictionary_entries_repository_id_data_dictionary_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."data_dictionary_repositories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_dictionary_entries_repository_entry_key_idx" ON "data_dictionary_entries" USING btree ("repository_id","entry_key");--> statement-breakpoint
CREATE UNIQUE INDEX "data_dictionary_entries_canonical_uri_idx" ON "data_dictionary_entries" USING btree ("canonical_uri");