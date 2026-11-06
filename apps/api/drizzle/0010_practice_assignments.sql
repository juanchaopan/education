CREATE TABLE "assignments" (
	"child_id" uuid NOT NULL,
	"problem_id" text NOT NULL,
	"problem_version" bigint NOT NULL,
	CONSTRAINT "assignments_child_id_problem_id_problem_version_pk" PRIMARY KEY("child_id","problem_id","problem_version")
);
--> statement-breakpoint
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;