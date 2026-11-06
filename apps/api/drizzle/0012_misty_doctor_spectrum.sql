CREATE TYPE "public"."ai_usage_state" AS ENUM('reserved', 'released', 'unknown', 'settled', 'out-of-bounds');--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"child_id" uuid,
	"model" text NOT NULL,
	"budget_month" date NOT NULL,
	"admitted_at" timestamp with time zone NOT NULL,
	"state" "ai_usage_state" DEFAULT 'reserved' NOT NULL,
	"amount_nanodollars" bigint NOT NULL,
	"input_tokens" bigint,
	"output_tokens" bigint
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_month" ON "ai_usage" USING btree ("budget_month");--> statement-breakpoint
CREATE INDEX "ai_usage_family_time" ON "ai_usage" USING btree ("family_id","admitted_at");--> statement-breakpoint
CREATE INDEX "ai_usage_child_time" ON "ai_usage" USING btree ("child_id","admitted_at");