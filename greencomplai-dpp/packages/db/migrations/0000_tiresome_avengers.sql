CREATE TYPE "public"."dpp_status" AS ENUM('draft', 'review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('admin', 'editor', 'viewer', 'authority');--> statement-breakpoint
CREATE TYPE "public"."schema_definition_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"dpp_id" uuid,
	"actor_user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"patch" jsonb,
	"changed_properties" jsonb,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blob_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"checksum" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blob_objects_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "dpp_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dpp_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "dpp_status" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dpps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"digital_product_passport_id" text NOT NULL,
	"product_id" text NOT NULL,
	"granularity" text NOT NULL,
	"dpp_schema_version" text NOT NULL,
	"status" "dpp_status" DEFAULT 'draft' NOT NULL,
	"last_update" timestamp with time zone DEFAULT now() NOT NULL,
	"economic_operator_id" text NOT NULL,
	"facility_id" text,
	"active_version_id" uuid,
	"current_snapshot" jsonb NOT NULL,
	"public_projection" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "organization_role" NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "schema_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"dictionary_reference" text,
	"json_schema" jsonb NOT NULL,
	"status" "schema_definition_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_dpp_id_dpps_id_fk" FOREIGN KEY ("dpp_id") REFERENCES "public"."dpps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blob_objects" ADD CONSTRAINT "blob_objects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpp_versions" ADD CONSTRAINT "dpp_versions_dpp_id_dpps_id_fk" FOREIGN KEY ("dpp_id") REFERENCES "public"."dpps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpps" ADD CONSTRAINT "dpps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_definitions" ADD CONSTRAINT "schema_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_org_created_at_idx" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_dpp_created_at_idx" ON "audit_events" USING btree ("dpp_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dpp_versions_dpp_version_idx" ON "dpp_versions" USING btree ("dpp_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "dpps_org_dpp_id_idx" ON "dpps" USING btree ("organization_id","digital_product_passport_id");--> statement-breakpoint
CREATE INDEX "dpps_org_product_id_idx" ON "dpps" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "dpps_status_idx" ON "dpps" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_org_user_idx" ON "organization_memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schema_definitions_name_version_idx" ON "schema_definitions" USING btree ("organization_id","name","version");