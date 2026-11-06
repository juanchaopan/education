CREATE TYPE "public"."attempt_outcome" AS ENUM('independent', 'assisted', 'incorrect', 'uncertain');--> statement-breakpoint
CREATE TABLE "attempts" (
	"child_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"problem_version" bigint NOT NULL,
	"attempt_id" uuid NOT NULL,
	"round" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"outcome" "attempt_outcome" NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_child_id_problem_id_problem_version_attempt_id_pk" PRIMARY KEY("child_id","problem_id","problem_version","attempt_id")
);
--> statement-breakpoint
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "help_events" (
	"child_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"problem_version" bigint NOT NULL,
	"round" uuid NOT NULL,
	"hint_id" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "help_events_child_id_problem_id_problem_version_round_hint_id_pk" PRIMARY KEY("child_id","problem_id","problem_version","round","hint_id")
);
--> statement-breakpoint
ALTER TABLE "help_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "progress" (
	"child_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"problem_version" bigint NOT NULL,
	"round" uuid NOT NULL,
	"independent" integer DEFAULT 0 NOT NULL,
	"assisted" integer DEFAULT 0 NOT NULL,
	"incorrect" integer DEFAULT 0 NOT NULL,
	"uncertain" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_child_id_problem_id_problem_version_pk" PRIMARY KEY("child_id","problem_id","problem_version")
);
--> statement-breakpoint
ALTER TABLE "progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_events" ADD CONSTRAINT "help_events_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;