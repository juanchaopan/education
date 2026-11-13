-- Study time: one total of seconds per child per day of the family's time
-- zone, and the moment of each child's last heartbeat, which only measures
-- the next interval. Both go with the child. Learning before this migration
-- has no study time.
CREATE TABLE "study_beats" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"beat_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_beats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "study_days" (
	"child_id" uuid NOT NULL,
	"day" date NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "study_days_child_id_day_pk" PRIMARY KEY("child_id","day"),
	CONSTRAINT "study_days_seconds" CHECK ("study_days"."seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "study_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "study_beats" ADD CONSTRAINT "study_beats_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_days" ADD CONSTRAINT "study_days_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
