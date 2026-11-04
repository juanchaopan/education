CREATE TABLE "registration_attempts" (
	"bucket" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "registration_attempts_bucket_time" ON "registration_attempts" USING btree ("bucket","attempted_at");