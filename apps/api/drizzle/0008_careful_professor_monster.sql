ALTER TABLE "drafts" ALTER COLUMN "problem_version" SET DATA TYPE bigint;--> statement-breakpoint
CREATE INDEX "draft_expiry" ON "drafts" USING btree ("expires_at");