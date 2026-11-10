import { Type, type Static } from '@sinclair/typebox';
import { ParentPassword } from './registration.js';
export const RecoveryRequest = Type.Object(
  {
    email: Type.String({ minLength: 3, maxLength: 254 }),
    action: Type.Union([Type.Literal('send'), Type.Literal('resend'), Type.Literal('retry')]),
  },
  { additionalProperties: false },
);
export type RecoveryRequest = Static<typeof RecoveryRequest>;
export const PasswordReset = Type.Object(
  {
    token: Type.String({ pattern: '^[A-Za-z0-9_-]{43}$' }),
    password: ParentPassword,
  },
  { additionalProperties: false },
);
export type PasswordReset = Static<typeof PasswordReset>;
export const RecoveryReceipt = Type.Object({ status: Type.Literal('requested') });
export const PasswordResetResult = Type.Object({ status: Type.Literal('reset') });
