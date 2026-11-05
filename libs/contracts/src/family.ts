import { Type } from '@sinclair/typebox';
export const FamilyCode = Type.String({
  pattern: '^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){2}$',
});
