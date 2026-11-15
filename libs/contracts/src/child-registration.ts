import { FamilyCode } from './family.js';
import { Type, type Static } from '@sinclair/typebox';

// How long a child's nickname may be, counted in Unicode code points once it
// is normalized and trimmed, as the server stores it. The registration page
// counts a nickname being typed the same way.
export const childNicknameLength = 12;
export const nicknameCharacters = (nickname: string) =>
  Array.from(nickname.normalize('NFKC').trim()).length;

export const ChildRegistration = Type.Object(
  {
    requestId: Type.String({ pattern: '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' }),
    key: Type.String({ minLength: 16, maxLength: 32 }),
    nickname: Type.String({ minLength: 1, maxLength: 64 }),
    pin: Type.String({ pattern: '^[0-9]{6}$' }),
  },
  { additionalProperties: false },
);
export type ChildRegistration = Static<typeof ChildRegistration>;
export const ChildRegistrationReceipt = Type.Object(
  {
    status: Type.Literal('registered'),
    familyCode: FamilyCode,
    nickname: Type.String({ minLength: 1, maxLength: 24 }),
  },
  { additionalProperties: false },
);
export type ChildRegistrationReceipt = Static<typeof ChildRegistrationReceipt>;
