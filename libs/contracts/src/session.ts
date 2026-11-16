import { Type, type Static } from '@sinclair/typebox';

export const ParentLogin = Type.Object(
  {
    email: Type.String({ minLength: 3, maxLength: 254 }),
    password: Type.String({ minLength: 1, maxLength: 128 }),
  },
  { additionalProperties: false },
);
export type ParentLogin = Static<typeof ParentLogin>;
export const ParentSession = Type.Object({
  role: Type.Literal('parent'),
  email: Type.String(),
  emailVerified: Type.Boolean(),
  access: Type.Union([Type.Literal('verified'), Type.Literal('verification-only')]),
  csrfToken: Type.String({ pattern: '^[A-Za-z0-9_-]{43}$' }),
});
export type ParentSession = Static<typeof ParentSession>;

// The reason a 429 carries when the server is busy checking other passwords
// and PINs, and what the family is told: the attempt was not counted, and
// trying again in a few seconds works. A 429 for too many failed attempts
// carries no reason.
export const authenticationBusy = 'busy';
export const authenticationBusyMessage = '现在登录的人有点多，请过几秒再试。';
export const AuthenticationBusy = Type.Object({
  message: Type.String(),
  reason: Type.Literal(authenticationBusy),
});
