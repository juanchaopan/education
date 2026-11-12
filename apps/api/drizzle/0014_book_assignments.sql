CREATE TABLE "book_assignments" (
	"child_id" uuid NOT NULL,
	"book_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_assignments_child_id_book_id_pk" PRIMARY KEY("child_id","book_id")
);
--> statement-breakpoint
ALTER TABLE "book_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "book_assignments" ADD CONSTRAINT "book_assignments_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;