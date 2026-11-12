-- Parents give children whole books (book_assignments). The single problems
-- planned one at a time are discarded, not turned into books, as the
-- maintainer approved on 2026-11-12, including any planned between the two
-- releases that brought in the books. Learning records, progress and drafts
-- are in other tables and stay.
DROP TABLE "assignments" CASCADE;
