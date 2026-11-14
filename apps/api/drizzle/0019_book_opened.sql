-- A book given to a child stays new until the child first opens one of its
-- problems in practice; opened_at is that moment. Books given before this
-- migration have none and show as new until then.
ALTER TABLE "book_assignments" ADD COLUMN "opened_at" timestamp with time zone;
