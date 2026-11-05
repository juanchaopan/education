CREATE TABLE "key_generation_attempts" (
	"family_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parent_sessions" ADD COLUMN "password_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registration_keys" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_keys" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "key_generation_attempts" ADD CONSTRAINT "key_generation_attempts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "key_generation_family_time" ON "key_generation_attempts" USING btree ("family_id","attempted_at");--> statement-breakpoint
-- Keep the newest unused legacy key before enforcing the per-family invariant.
WITH pending AS (
  SELECT id, row_number() OVER (PARTITION BY family_id ORDER BY expires_at DESC, id DESC) AS ordinal
  FROM registration_keys WHERE consumed_at IS NULL AND revoked_at IS NULL
)
UPDATE registration_keys SET revoked_at=now() WHERE id IN (SELECT id FROM pending WHERE ordinal > 1);
--> statement-breakpoint
CREATE UNIQUE INDEX "registration_keys_family_pending" ON "registration_keys" USING btree ("family_id") WHERE "registration_keys"."consumed_at" IS NULL AND "registration_keys"."revoked_at" IS NULL;