CREATE TYPE "public"."dpp_relationship_type" AS ENUM('contains', 'isComponentOf', 'replaces', 'isVariantOf', 'derivedFrom', 'hasPackaging', 'hasSparePart');--> statement-breakpoint
CREATE TYPE "public"."visibility_level" AS ENUM('public', 'controlled');--> statement-breakpoint
CREATE TABLE "dpp_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_dpp_id" uuid NOT NULL,
	"target_dpp_id" uuid,
	"target_digital_product_passport_id" text NOT NULL,
	"target_product_id" text,
	"relationship_type" "dpp_relationship_type" NOT NULL,
	"visibility" "visibility_level" DEFAULT 'controlled' NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dpp_relationships" ADD CONSTRAINT "dpp_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpp_relationships" ADD CONSTRAINT "dpp_relationships_source_dpp_id_dpps_id_fk" FOREIGN KEY ("source_dpp_id") REFERENCES "public"."dpps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpp_relationships" ADD CONSTRAINT "dpp_relationships_target_dpp_id_dpps_id_fk" FOREIGN KEY ("target_dpp_id") REFERENCES "public"."dpps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dpp_relationships_source_idx" ON "dpp_relationships" USING btree ("organization_id","source_dpp_id");--> statement-breakpoint
CREATE INDEX "dpp_relationships_target_idx" ON "dpp_relationships" USING btree ("organization_id","target_digital_product_passport_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dpp_relationships_source_type_target_idx" ON "dpp_relationships" USING btree ("organization_id","source_dpp_id","relationship_type","target_digital_product_passport_id");