import { Type, type Static } from '@sinclair/typebox';

export const ChildAccess = Type.Object(
  {
    id: Type.String({ pattern: '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' }),
    nickname: Type.String({ minLength: 1, maxLength: 24 }),
    credentialVersion: Type.Integer({ minimum: 1, maximum: 2147483646 }),
  },
  { additionalProperties: false },
);
export type ChildAccess = Static<typeof ChildAccess>;
export const FamilyChildren = Type.Object(
  {
    children: Type.Array(ChildAccess),
    reauthenticationRequired: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type FamilyChildren = Static<typeof FamilyChildren>;
export const ChildAccessReset = Type.Object(
  {
    childId: Type.String({ pattern: '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' }),
    credentialVersion: Type.Integer({ minimum: 1, maximum: 2147483646 }),
    pin: Type.String({ pattern: '^[0-9]{6}$' }),
  },
  { additionalProperties: false },
);
export type ChildAccessReset = Static<typeof ChildAccessReset>;
