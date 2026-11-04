import { Type, type Static } from '@sinclair/typebox';

export const ParentRegistration = Type.Object(
  {
    email: Type.String({ minLength: 3, maxLength: 254 }),
    password: Type.String({ minLength: 15, maxLength: 128 }),
  },
  { additionalProperties: false },
);
export type ParentRegistration = Static<typeof ParentRegistration>;

export const RegistrationReceipt = Type.Object({
  status: Type.Literal('pending-verification'),
  mail: Type.Literal('not-sent'),
});
export type RegistrationReceipt = Static<typeof RegistrationReceipt>;

const commonPasswords = new Set([
  'password123456789',
  '123456789012345',
  '1234567890123456',
  'qwertyuiopasdfgh',
  'iloveyouiloveyou',
  'letmeinletmeinletmein',
]);

export function passwordIssue(password: string): string | undefined {
  const length = Array.from(password).length;
  if (length < 15 || length > 128) {
    return '密码需要 15–128 个字符，最多 512 字节。可以使用空格或一句好记的话。';
  }
  if (commonPasswords.has(password.toLowerCase()) || /^(.)\1+$/su.test(password)) {
    return '这个密码太常见了，请换一句只有您知道的话。';
  }
  return undefined;
}
