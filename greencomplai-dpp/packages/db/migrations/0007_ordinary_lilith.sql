DROP INDEX "dpps_org_dpp_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "dpps_dpp_id_idx" ON "dpps" USING btree ("digital_product_passport_id");