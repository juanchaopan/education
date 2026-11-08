import { describe, expect, it } from 'vitest';
import { providerAvailability, providerSettings } from './ai-provider-settings.js';
import { readConfig } from './shared/config.js';

const availability = (env: NodeJS.ProcessEnv) => providerAvailability(readConfig(env).ai);
const configured = {
  OPENAI_API_KEY: 'synthetic-key',
  OPENAI_TUTORING_ELIGIBLE: 'true',
  OPENAI_TRANSCRIPTION_ELIGIBLE: 'true',
};

describe('paid AI provider settings', () => {
  it('keeps paid AI switched on by default while nothing can be called without a key', () => {
    expect(providerSettings(readConfig({}).ai, 'openai-tutoring')).toEqual({
      paidAiEnabled: true,
      apiKey: '',
      eligible: false,
    });
    const none = { 'openai-tutoring': 'unavailable', 'openai-transcription': 'unavailable' };
    expect(availability({})).toEqual(none);
    expect(availability({ ...configured, OPENAI_API_KEY: '  ' })).toEqual(none);
  });

  it('needs the switch, the key and each service’s own eligibility', () => {
    expect(availability(configured)).toEqual({
      'openai-tutoring': 'ready',
      'openai-transcription': 'ready',
    });
    expect(availability({ ...configured, PAID_AI_ENABLED: 'false' })).toEqual({
      'openai-tutoring': 'unavailable',
      'openai-transcription': 'unavailable',
    });
    expect(availability({ ...configured, OPENAI_TRANSCRIPTION_ELIGIBLE: 'false' })).toEqual({
      'openai-tutoring': 'ready',
      'openai-transcription': 'unavailable',
    });
  });
});
