CREATE TYPE "public"."facility_type" AS ENUM('manufacturing', 'assembly', 'testing', 'warehouse', 'recycling', 'repair', 'other');--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" text NOT NULL,
	"name" text NOT NULL,
	"facility_type" "facility_type" DEFAULT 'manufacturing' NOT NULL,
	"operator_id" text,
	"country_code" text,
	"address" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_org_facility_id_idx" ON "facilities" USING btree ("organization_id","facility_id");--> statement-breakpoint
CREATE INDEX "facilities_name_idx" ON "facilities" USING btree ("name");