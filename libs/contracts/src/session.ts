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
