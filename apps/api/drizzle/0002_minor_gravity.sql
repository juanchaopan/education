CREATE TABLE "parent_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"parent_id" uuid NOT NULL,
	"credential_version" integer NOT NULL,
	"family_epoch" integer NOT NULL,
	"verified" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "auth_epoch" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "credential_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "parent_sessions" ADD CONSTRAINT "parent_sessions_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parent_sessions_parent" ON "parent_sessions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "parent_sessions_expiry" ON "parent_sessions" USING btree ("expires_at");