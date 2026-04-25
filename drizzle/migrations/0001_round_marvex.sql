CREATE TABLE "budget_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"promotion_type" text NOT NULL,
	"budget_plan" double precision DEFAULT 0 NOT NULL,
	"impressions_plan" integer DEFAULT 0 NOT NULL,
	"clicks_plan" integer DEFAULT 0 NOT NULL,
	"reach_plan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "budget_plans_promo_idx" ON "budget_plans" USING btree ("promotion_type");