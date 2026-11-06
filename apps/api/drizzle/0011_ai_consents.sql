CREATE TABLE "ai_consents" (
	"family_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"policy_version" integer NOT NULL,
	"granted" boolean NOT NULL,
	"revision" uuid DEFAULT gen_random_uuid() NOT NULL,
	"changed_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "ai_consents_family_id_scope_pk" PRIMARY KEY("family_id","scope")
);
--> statement-breakpoint
ALTER TABLE "ai_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;