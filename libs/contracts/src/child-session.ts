import { Type, type Static } from '@sinclair/typebox';

export const ChildLogin = Type.Object(
  {
    familyCode: Type.String({ minLength: 1, maxLength: 32 }),
    nickname: Type.String({ minLength: 1, maxLength: 64 }),
    pin: Type.String({ pattern: '^[0-9]{6}$' }),
  },
  { additionalProperties: false },
);
export type ChildLogin = Static<typeof ChildLogin>;
export const ChildSession = Type.Object(
  {
    role: Type.Literal('child'),
    nickname: Type.String({ minLength: 1, maxLength: 24 }),
    csrfToken: Type.String({ pattern: '^[A-Za-z0-9_-]{43}$' }),
  },
  { additionalProperties: false },
);
export type ChildSession = Static<typeof ChildSession>;
