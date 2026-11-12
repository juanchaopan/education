CREATE TYPE "public"."variation_part" AS ENUM('guess', 'reason');--> statement-breakpoint
CREATE TABLE "variation_answers" (
	"child_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"problem_version" bigint NOT NULL,
	"attempt_id" uuid NOT NULL,
	"round" uuid NOT NULL,
	"part" "variation_part" NOT NULL,
	"fingerprint" text,
	"outcome" "attempt_outcome" NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "variation_answers_child_id_problem_id_problem_version_attempt_id_pk" PRIMARY KEY("child_id","problem_id","problem_version","attempt_id"),
	CONSTRAINT "variation_answers_judged" CHECK ("variation_answers"."outcome" <> 'uncertain'),
	CONSTRAINT "variation_answers_guess_digest" CHECK (("variation_answers"."part" = 'guess') = ("variation_answers"."fingerprint" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "variation_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "variation_help" (
	"child_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"problem_version" bigint NOT NULL,
	"round" uuid NOT NULL,
	"help_id" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "variation_help_child_id_problem_id_problem_version_round_help_id_pk" PRIMARY KEY("child_id","problem_id","problem_version","round","help_id")
);
--> statement-breakpoint
ALTER TABLE "variation_help" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "variation_answers" ADD CONSTRAINT "variation_answers_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variation_help" ADD CONSTRAINT "variation_help_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "variation_answers_one_guess" ON "variation_answers" USING btree ("child_id","problem_id","problem_version","round") WHERE "variation_answers"."part" = 'guess';--> statement-breakpoint
CREATE UNIQUE INDEX "variation_answers_one_clear_reason" ON "variation_answers" USING btree ("child_id","problem_id","problem_version","round") WHERE "variation_answers"."part" = 'reason' AND "variation_answers"."outcome" IN ('independent', 'assisted');