import { Type, type Static } from '@sinclair/typebox';
export const ParentReauthentication = Type.Object(
  { password: Type.String({ minLength: 1, maxLength: 128 }) },
  { additionalProperties: false },
);
export const RegistrationKeyInfo = Type.Object(
  {
    id: Type.String({ pattern: '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' }),
    status: Type.Union(
      (['active', 'expired', 'revoked', 'used'] as const).map((status) => Type.Literal(status)),
    ),
    expiresAt: Type.String({
      pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$',
    }),
  },
  { additionalProperties: false },
);
export type RegistrationKeyInfo = Static<typeof RegistrationKeyInfo>;
export const RegistrationKeyStatus = Type.Object(
  { key: Type.Union([RegistrationKeyInfo, Type.Null()]), reauthenticationRequired: Type.Boolean() },
  { additionalProperties: false },
);
export type RegistrationKeyStatus = Static<typeof RegistrationKeyStatus>;
export const GeneratedRegistrationKey = Type.Object(
  {
    key: RegistrationKeyInfo,
    value: Type.String({ pattern: '^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$' }),
  },
  { additionalProperties: false },
);
export type GeneratedRegistrationKey = Static<typeof GeneratedRegistrationKey>;
export const RegistrationKeyRevocation = Type.Object(
  { id: Type.String({ pattern: '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' }) },
  { additionalProperties: false },
);
