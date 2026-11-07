import type { AiAvailability, AiConsentScope } from '@education/contracts';
import { unavailableReason, type ProviderSettings } from './ai/services/metered-call.js';
import type { AiConfig } from './shared/config.js';

export function providerSettings(config: AiConfig, scope: AiConsentScope): ProviderSettings {
  return {
    paidAiEnabled: config.paidAiEnabled,
    apiKey: config.apiKey,
    eligible: config.eligible[scope],
  };
}

// Whether each service can be called at all in this deployment, as the parent
// is told. The reason one cannot is an operator matter and is not shown.
export function providerAvailability(config: AiConfig): AiAvailability {
  const availability = (scope: AiConsentScope) =>
    unavailableReason(providerSettings(config, scope)) ? 'unavailable' : 'ready';
  return {
    'openai-tutoring': availability('openai-tutoring'),
    'openai-transcription': availability('openai-transcription'),
  };
}
