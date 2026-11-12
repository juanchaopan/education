import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const families = pgTable('families', {
  code: text('code').unique(),
  authEpoch: integer('auth_epoch').default(1).notNull(),
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const aiConsents = pgTable(
  'ai_consents',
  {
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    scope: text('scope').notNull(),
    policyVersion: integer('policy_version').notNull(),
    granted: boolean('granted').notNull(),
    revision: uuid('revision').defaultRandom().notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true })
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.familyId, table.scope] })],
).enableRLS();

export const parents = pgTable('parents', {
  credentialVersion: integer('credential_version').default(1).notNull(),
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
});

export const registrationAttempts = pgTable(
  'registration_attempts',
  {
    bucket: text('bucket').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('registration_attempts_bucket_time').on(table.bucket, table.attemptedAt)],
);

export const children = pgTable(
  'children',
  {
    credentialVersion: integer('credential_version').default(1).notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    nickname: text('nickname').notNull(),
    canonicalNickname: text('canonical_nickname').notNull(),
    pinPepperVersion: integer('pin_pepper_version'),
    pinHash: text('pin_hash').notNull(),
  },
  (table) => [uniqueIndex('child_family_nickname').on(table.familyId, table.canonicalNickname)],
);

export const aiUsageState = pgEnum('ai_usage_state', [
  'reserved',
  'released',
  'unknown',
  'settled',
  'out-of-bounds',
]);

export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
    childId: uuid('child_id').references(() => children.id, { onDelete: 'set null' }),
    model: text('model').notNull(),
    budgetMonth: date('budget_month').notNull(),
    admittedAt: timestamp('admitted_at', { withTimezone: true }).notNull(),
    state: aiUsageState('state').default('reserved').notNull(),
    amount: bigint('amount_nanodollars', { mode: 'bigint' }).notNull(),
    inputTokens: bigint('input_tokens', { mode: 'number' }),
    outputTokens: bigint('output_tokens', { mode: 'number' }),
  },
  (table) => [
    index('ai_usage_month').on(table.budgetMonth),
    index('ai_usage_family_time').on(table.familyId, table.admittedAt),
    index('ai_usage_child_time').on(table.childId, table.admittedAt),
  ],
).enableRLS();

export const registrationKeys = pgTable(
  'registration_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    keyHash: text('key_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('registration_keys_family_pending')
      .on(table.familyId)
      .where(sql`${table.consumedAt} IS NULL AND ${table.revokedAt} IS NULL`),
  ],
);

export const keyGenerationAttempts = pgTable(
  'key_generation_attempts',
  {
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('key_generation_family_time').on(table.familyId, table.attemptedAt)],
);

export const drafts = pgTable(
  'drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    problemId: text('problem_id').notNull(),
    problemVersion: bigint('problem_version', { mode: 'number' }).notNull(),
    revision: integer('revision').default(1).notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('draft_child_problem').on(table.childId, table.problemId, table.problemVersion),
    index('draft_expiry').on(table.expiresAt),
  ],
);

const learningSlot = () => ({
  childId: uuid('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  problemId: text('problem_id').notNull(),
  problemVersion: bigint('problem_version', { mode: 'number' }).notNull(),
});

// The books a parent has given each child, by the book's stable id; the book
// list itself is in the problem catalogue. A child holds a book at most once,
// and the row goes with the child.
export const bookAssignments = pgTable(
  'book_assignments',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    bookId: text('book_id').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.childId, table.bookId] })],
).enableRLS();

export const attemptOutcome = pgEnum('attempt_outcome', [
  'independent',
  'assisted',
  'incorrect',
  'uncertain',
]);

export const attempts = pgTable(
  'attempts',
  {
    ...learningSlot(),
    attemptId: uuid('attempt_id').notNull(),
    round: uuid('round').notNull(),
    fingerprint: text('fingerprint').notNull(),
    outcome: attemptOutcome('outcome').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.childId, table.problemId, table.problemVersion, table.attemptId],
    }),
  ],
).enableRLS();

export const progress = pgTable(
  'progress',
  {
    ...learningSlot(),
    round: uuid('round').notNull(),
    independent: integer('independent').default(0).notNull(),
    assisted: integer('assisted').default(0).notNull(),
    incorrect: integer('incorrect').default(0).notNull(),
    uncertain: integer('uncertain').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.childId, table.problemId, table.problemVersion] })],
).enableRLS();

export const helpEvents = pgTable(
  'help_events',
  {
    ...learningSlot(),
    round: uuid('round').notNull(),
    hintId: text('hint_id').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.childId, table.problemId, table.problemVersion, table.round, table.hintId],
    }),
  ],
).enableRLS();

export const parentSessions = pgTable(
  'parent_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    passwordVerifiedAt: timestamp('password_verified_at', { withTimezone: true }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    credentialVersion: integer('credential_version').notNull(),
    familyEpoch: integer('family_epoch').notNull(),
    verified: boolean('verified').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('parent_sessions_parent').on(table.parentId),
    index('parent_sessions_expiry').on(table.expiresAt),
  ],
);

export const childSessions = pgTable(
  'child_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    credentialVersion: integer('credential_version').notNull(),
    familyEpoch: integer('family_epoch').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('child_sessions_child').on(table.childId),
    index('child_sessions_expiry').on(table.expiresAt),
  ],
);

export const emailVerifications = pgTable('email_verifications', mailIntentColumns());
export const verificationAttempts = pgTable(
  'verification_attempts',
  {
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('verification_attempts_parent_time').on(table.parentId, table.attemptedAt)],
);

export const passwordResets = pgTable('password_resets', mailIntentColumns());
export const recoveryAttempts = pgTable(
  'recovery_attempts',
  {
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('recovery_attempts_parent_time').on(table.parentId, table.attemptedAt)],
);

function mailIntentColumns() {
  return {
    parentId: uuid('parent_id')
      .primaryKey()
      .references(() => parents.id, { onDelete: 'cascade' }),
    id: uuid('id').notNull().unique(),
    tokenHash: text('token_hash').notNull().unique(),
    payload: text('payload'),
    status: text('status').notNull(),
    attempts: integer('attempts').default(1).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  };
}

export const childRegistrations = pgTable('child_registrations', {
  requestHash: text('request_hash').primaryKey(),
  fingerprint: text('fingerprint').notNull(),
  childId: uuid('child_id')
    .notNull()
    .unique()
    .references(() => children.id, { onDelete: 'cascade' }),
  keyId: uuid('key_id')
    .notNull()
    .unique()
    .references(() => registrationKeys.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Whether the service is open: one row while it is. Backups leave this table's
// row out, so a restored database stays closed until the deletions recorded
// since the backup are replayed and the result is checked.
export const serviceGate = pgTable(
  'service_gate',
  {
    open: boolean('open').default(true).primaryKey(),
    openedAt: timestamp('opened_at', { withTimezone: true })
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [check('service_gate_single_row', sql`${table.open}`)],
).enableRLS();
