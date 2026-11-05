CREATE TABLE "child_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"credential_version" integer NOT NULL,
	"family_epoch" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "credential_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "child_sessions" ADD CONSTRAINT "child_sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "child_sessions_child" ON "child_sessions" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "child_sessions_expiry" ON "child_sessions" USING btree ("expires_at");