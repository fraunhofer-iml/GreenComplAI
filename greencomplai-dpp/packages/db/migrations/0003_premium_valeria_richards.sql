CREATE TYPE "public"."data_value_type" AS ENUM('string', 'number', 'boolean', 'date', 'datetime', 'enum', 'object', 'array', 'document');--> statement-breakpoint
CREATE TYPE "public"."economic_operator_role" AS ENUM('manufacturer', 'importer', 'distributor', 'authorizedRepresentative', 'serviceProvider', 'recycler', 'authority');--> statement-breakpoint
CREATE TYPE "public"."product_identifier_type" AS ENUM('gtin', 'serialNumber', 'batch', 'model', 'sku', 'other');--> statement-breakpoint
CREATE TYPE "public"."product_lifecycle_status" AS ENUM('concept', 'active', 'endOfLife', 'recalled');--> statement-breakpoint
CREATE TABLE "data_dictionary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entry_key" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"value_type" "data_value_type" NOT NULL,
	"unit" text,
	"required" boolean DEFAULT false NOT NULL,
	"visibility" "visibility_level" DEFAULT 'controlled' NOT NULL,
	"standard_reference" text,
	"allowed_values" jsonb,
	"validation_rules" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dpp_economic_operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dpp_id" uuid NOT NULL,
	"economic_operator_id" uuid NOT NULL,
	"role" "economic_operator_role" NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dpp_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dpp_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"role" text DEFAULT 'subject' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"operator_id" text NOT NULL,
	"legal_name" text NOT NULL,
	"roles" jsonb NOT NULL,
	"country_code" text,
	"vat_id" text,
	"address" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"identifier_type" "product_identifier_type" NOT NULL,
	"identifier_value" text NOT NULL,
	"issuer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"name" jsonb NOT NULL,
	"category" text,
	"manufacturer_product_id" text,
	"lifecycle_status" "product_lifecycle_status" DEFAULT 'active' NOT NULL,
	"identifiers" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schema_definitions" ADD COLUMN "dictionary_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "data_dictionary_entries" ADD CONSTRAINT "data_dictionary_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpp_economic_operators" ADD CONSTRAINT "dpp_economic_operators_dpp_id_dpps_id_fk" FOREIGN KEY ("dpp_id") REFERENCES "public"."dpps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpp_economic_operators" ADD CONSTRAINT "dpp_economic_operators_economic_operator_id_economic_operators_id_fk" FOREIGN KEY ("economic_operator_id") REFERENCES "public"."economic_operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpp_products" ADD CONSTRAINT "dpp_products_dpp_id_dpps_id_fk" FOREIGN KEY ("dpp_id") REFERENCES "public"."dpps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpp_products" ADD CONSTRAINT "dpp_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_operators" ADD CONSTRAINT "economic_operators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_identifiers" ADD CONSTRAINT "product_identifiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_dictionary_entries_org_entry_key_idx" ON "data_dictionary_entries" USING btree ("organization_id","entry_key");--> statement-breakpoint
CREATE INDEX "data_dictionary_entries_standard_reference_idx" ON "data_dictionary_entries" USING btree ("standard_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "dpp_economic_operators_dpp_operator_role_idx" ON "dpp_economic_operators" USING btree ("dpp_id","economic_operator_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "dpp_products_dpp_product_role_idx" ON "dpp_products" USING btree ("dpp_id","product_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "economic_operators_org_operator_id_idx" ON "economic_operators" USING btree ("organization_id","operator_id");--> statement-breakpoint
CREATE INDEX "economic_operators_legal_name_idx" ON "economic_operators" USING btree ("legal_name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_identifiers_product_type_value_idx" ON "product_identifiers" USING btree ("product_id","identifier_type","identifier_value");--> statement-breakpoint
CREATE INDEX "product_identifiers_type_value_idx" ON "product_identifiers" USING btree ("identifier_type","identifier_value");--> statement-breakpoint
CREATE UNIQUE INDEX "products_org_product_id_idx" ON "products" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "products_org_category_idx" ON "products" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "products_lifecycle_status_idx" ON "products" USING btree ("lifecycle_status");--> statement-breakpoint
ALTER TABLE "schema_definitions" ADD CONSTRAINT "schema_definitions_dictionary_entry_id_data_dictionary_entries_id_fk" FOREIGN KEY ("dictionary_entry_id") REFERENCES "public"."data_dictionary_entries"("id") ON DELETE set null ON UPDATE no action;