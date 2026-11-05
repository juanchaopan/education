CREATE TABLE "child_registrations" (
	"request_hash" text PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"child_id" uuid NOT NULL,
	"key_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "child_registrations_child_id_unique" UNIQUE("child_id"),
	CONSTRAINT "child_registrations_key_id_unique" UNIQUE("key_id")
);
--> statement-breakpoint
DROP INDEX "child_family_nickname";--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "canonical_nickname" text;--> statement-breakpoint
UPDATE "children" SET "canonical_nickname"=lower(btrim(normalize("nickname", NFKC)));--> statement-breakpoint
ALTER TABLE "children" ALTER COLUMN "canonical_nickname" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "pin_pepper_version" integer;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "child_registrations" ADD CONSTRAINT "child_registrations_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_registrations" ADD CONSTRAINT "child_registrations_key_id_registration_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."registration_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "child_family_nickname" ON "children" USING btree ("family_id","canonical_nickname");--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_code_unique" UNIQUE("code");