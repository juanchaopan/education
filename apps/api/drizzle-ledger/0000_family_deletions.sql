CREATE TABLE "family_deletions" (
	"sequence" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "family_deletions_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"family_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "family_deletions_family_id_unique" UNIQUE("family_id")
);
--> statement-breakpoint
ALTER TABLE "family_deletions" ENABLE ROW LEVEL SECURITY;