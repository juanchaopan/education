CREATE TABLE "service_gate" (
	"open" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"opened_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "service_gate_single_row" CHECK ("service_gate"."open")
);
--> statement-breakpoint
ALTER TABLE "service_gate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- A database built by migrations opens here. A restored backup has no row,
-- because backups leave it out, and opens only when its restore is checked.
INSERT INTO "service_gate" DEFAULT VALUES;
