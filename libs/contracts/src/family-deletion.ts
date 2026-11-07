import { Type, type Static } from '@sinclair/typebox';

const closed = { additionalProperties: false };

// The parent types this phrase, after confirming the password, to delete the family.
export const familyDeletionPhrase = '删除家庭';

export const FamilyDeletionRequest = Type.Object(
  { confirmation: Type.String({ maxLength: 32 }) },
  closed,
);
// deleted: the family is gone and every session is revoked. pending: the
// deletion is recorded in the ledger but the online data is not cleared yet;
// maintenance finishes it.
export const FamilyDeletionResult = Type.Object(
  { status: Type.Union([Type.Literal('deleted'), Type.Literal('pending')]) },
  closed,
);

export type FamilyDeletionRequest = Static<typeof FamilyDeletionRequest>;
export type FamilyDeletionResult = Static<typeof FamilyDeletionResult>;
