import { bigint, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// The deletion ledger lives in a database of its own, outside the application
// database and its backups, so a restored backup can be cleared of every family
// deleted after it was taken. It keeps only the internal family ID, when the
// deletion was accepted and finished, and the order to replay deletions in.
// Row-level security with no policies keeps hosted data APIs from reading it.
export const familyDeletions = pgTable('family_deletions', {
  sequence: bigint('sequence', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  familyId: uuid('family_id').notNull().unique(),
  requestedAt: timestamp('requested_at', { withTimezone: true })
    .default(sql`clock_timestamp()`)
    .notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}).enableRLS();
