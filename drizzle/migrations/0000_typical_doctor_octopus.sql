CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"platform" text NOT NULL,
	"campaign_type" text NOT NULL,
	"campaign_name" text NOT NULL,
	"promotion_type" text NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"spend" double precision DEFAULT 0 NOT NULL,
	"ctr" double precision,
	"cpc" double precision,
	"leads" integer,
	"sku" text,
	"add_to_cart" integer,
	"revenue" double precision,
	"drr" double precision,
	"reach" integer,
	"cpm" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_unique_idx" ON "campaigns" USING btree ("period","platform","campaign_type","campaign_name","promotion_type");--> statement-breakpoint
CREATE INDEX "idx_period" ON "campaigns" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_platform" ON "campaigns" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_campaign_type" ON "campaigns" USING btree ("campaign_type");--> statement-breakpoint
CREATE INDEX "idx_promotion_type" ON "campaigns" USING btree ("promotion_type");