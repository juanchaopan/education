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
