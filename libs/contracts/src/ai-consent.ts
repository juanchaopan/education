import { Type, type Static } from '@sinclair/typebox';

const scope = Type.Union([Type.Literal('openai-tutoring'), Type.Literal('openai-transcription')]);
const version = Type.Integer({ minimum: 1, maximum: 2_147_483_647 });
const revision = Type.Union([
  Type.String({ pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' }),
  Type.Null(),
]);
// Whether this deployment can call a service at all. Consent alone sends
// nothing while it is unavailable.
const availability = Type.Union([Type.Literal('ready'), Type.Literal('unavailable')]);
const policy = Type.Object({
  scope,
  policyVersion: version,
  title: Type.String(),
  provider: Type.String(),
  inputs: Type.String(),
  purpose: Type.String(),
  appRetention: Type.String(),
  providerRetention: Type.String(),
});

export const AiConsentChange = Type.Object(
  { scope, policyVersion: version, revision, granted: Type.Boolean() },
  { additionalProperties: false },
);
export const AiConsentView = Type.Object({
  reauthenticationRequired: Type.Boolean(),
  tutoringBudget: Type.Union([
    Type.Literal('unset'),
    Type.Literal('available'),
    Type.Literal('limited'),
  ]),
  policies: Type.Array(
    Type.Composite([
      policy,
      Type.Object({
        revision,
        state: Type.Union([
          Type.Literal('ungranted'),
          Type.Literal('granted'),
          Type.Literal('revoked'),
          Type.Literal('policy-changed'),
        ]),
        availability,
      }),
    ]),
  ),
});

export type AiConsentChange = Static<typeof AiConsentChange>;
export type AiConsentView = Static<typeof AiConsentView>;
export type AiConsentPolicy = Static<typeof policy>;
export type AiConsentScope = Static<typeof scope>;
// Each service's availability in this deployment.
export type AiAvailability = Record<AiConsentScope, Static<typeof availability>>;
