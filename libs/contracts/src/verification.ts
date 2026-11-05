import { Type, type Static } from '@sinclair/typebox';
export const VerificationAction = Type.Object(
  {
    action: Type.Union([Type.Literal('send'), Type.Literal('resend'), Type.Literal('retry')]),
  },
  { additionalProperties: false },
);
export type VerificationAction = Static<typeof VerificationAction>;
export const VerificationToken = Type.Object(
  { token: Type.String({ pattern: '^[A-Za-z0-9_-]{43}$' }) },
  { additionalProperties: false },
);
export type VerificationToken = Static<typeof VerificationToken>;
export const VerificationState = Type.Union([
  Type.Literal('not-sent'),
  Type.Literal('sending'),
  Type.Literal('accepted'),
  Type.Literal('retryable'),
  Type.Literal('rejected'),
  Type.Literal('authorization-failed'),
  Type.Literal('unknown'),
  Type.Literal('expired'),
  Type.Literal('verified'),
]);
export type VerificationState = Static<typeof VerificationState>;
export const VerificationStatus = Type.Object({
  enabled: Type.Boolean(),
  status: VerificationState,
  retryAfter: Type.Integer({ minimum: 0 }),
  canRetry: Type.Boolean(),
});
export type VerificationStatus = Static<typeof VerificationStatus>;
export const VerificationResult = Type.Object({ status: Type.Literal('verified') });
