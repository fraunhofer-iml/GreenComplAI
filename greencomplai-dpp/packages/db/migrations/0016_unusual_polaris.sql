CREATE TYPE "public"."connector_field_target" AS ENUM('ignore', 'attribute', 'element');--> statement-breakpoint
CREATE TABLE "connector_field_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_key" text NOT NULL,
	"source_type" text DEFAULT '' NOT NULL,
	"source_field" text NOT NULL,
	"target" "connector_field_target" DEFAULT 'attribute' NOT NULL,
	"dictionary_reference" text,
	"element_id" text,
	"collection_element_id" text,
	"collection_name" text,
	"visibility" "visibility_level" DEFAULT 'controlled' NOT NULL,
	"unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connector_field_mappings" ADD CONSTRAINT "connector_field_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connector_field_mappings_field_idx" ON "connector_field_mappings" USING btree ("organization_id","connector_key","source_type","source_field");