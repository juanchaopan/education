import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const families = pgTable('families', {
  authEpoch: integer('auth_epoch').default(1).notNull(),
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    nickname: text('nickname').notNull(),
    pinHash: text('pin_hash').notNull(),
  },
  (table) => [uniqueIndex('child_family_nickname').on(table.familyId, table.nickname)],
);

export const registrationKeys = pgTable('registration_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});

export const drafts = pgTable(
  'drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    problemId: text('problem_id').notNull(),
    problemVersion: integer('problem_version').notNull(),
    revision: integer('revision').default(1).notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('draft_child_problem').on(table.childId, table.problemId, table.problemVersion),
  ],
);

export const parentSessions = pgTable(
  'parent_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
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

export const emailVerifications = pgTable('email_verifications', {
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
});
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
