import { Type } from '@sinclair/typebox';

export const AI_HELP_TIMEOUT_MS = 10_000;

export const aiHelpFallbackReasons = [
  'disabled',
  'missing-key',
  'ineligible',
  'unauthorized',
  'invalid-input',
  'usage-limited',
  'unavailable',
  'timeout',
  'cancelled',
] as const;

export type AiHelpFallback = (typeof aiHelpFallbackReasons)[number];

export const AiHelpFallbackSchema = Type.Union(
  aiHelpFallbackReasons.map((reason) => Type.Literal(reason)),
);

// How every AI help reply says the child goes on without the AI, and why.
export const AiHelpFallbackResult = Type.Object(
  { status: Type.Literal('fallback'), reason: AiHelpFallbackSchema },
  { additionalProperties: false },
);
