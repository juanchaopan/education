export const AI_HELP_TIMEOUT_MS = 10_000;

export type AiHelpFallback =
  | 'disabled'
  | 'missing-key'
  | 'ineligible'
  | 'unauthorized'
  | 'invalid-input'
  | 'unavailable'
  | 'timeout'
  | 'cancelled';

export type AiHelpResult =
  { status: 'ready'; text: string } | { status: 'fallback'; reason: AiHelpFallback };
