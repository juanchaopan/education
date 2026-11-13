import { Type, type Static } from '@sinclair/typebox';
import { TimeZoneName } from './calendar.js';

// How long a parent's password may be, counted in Unicode code points: a
// Chinese character or a single emoji is one, an emoji joined from several
// is several. Sign-up and password reset share the rule, and the web pages
// count a password being typed the same way.
export const parentPasswordLength = { shortest: 15, longest: 128 } as const;
export const passwordCharacters = (password: string) => Array.from(password).length;

export const ParentPassword = Type.String({
  minLength: parentPasswordLength.shortest,
  maxLength: parentPasswordLength.longest,
});

// The sign-up page sends the browser's time zone for the new family. A page
// that predates it sends none, and a name the server does not know is taken
// as none; the family then gets its zone from a parent's device later.
export const ParentRegistration = Type.Object(
  {
    email: Type.String({ minLength: 3, maxLength: 254 }),
    password: ParentPassword,
    timeZone: Type.Optional(TimeZoneName),
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
  const length = passwordCharacters(password);
  const { shortest, longest } = parentPasswordLength;
  if (length < shortest || length > longest) {
    return `密码需要 ${shortest}–${longest} 个字符，最多 512 字节。可以使用空格或一句好记的话。`;
  }
  if (commonPasswords.has(password.toLowerCase()) || /^(.)\1+$/su.test(password)) {
    return '这个密码太常见了，请换一句只有您知道的话。';
  }
  return undefined;
}
