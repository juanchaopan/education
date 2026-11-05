CREATE TABLE "password_resets" (
	"parent_id" uuid PRIMARY KEY NOT NULL,
	"id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"payload" text,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "password_resets_id_unique" UNIQUE("id"),
	CONSTRAINT "password_resets_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "recovery_attempts" (
	"parent_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_attempts" ADD CONSTRAINT "recovery_attempts_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recovery_attempts_parent_time" ON "recovery_attempts" USING btree ("parent_id","attempted_at");