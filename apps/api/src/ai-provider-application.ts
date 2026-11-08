import type pg from 'pg';
import type { AiConsentChange } from '@education/contracts';
import { createAiConsent } from './ai-consent-application.js';
import { providerSettings } from './ai-provider-settings.js';
import { createTutoringUsage } from './ai/repositories/postgres-tutoring-usage.js';
import type { Admission, Meter, ProviderSettings } from './ai/services/metered-call.js';
import { readConfig } from './shared/config.js';

// Settings, consent and metering for one paid AI service. Each service has its
// own family consent scope; all share one usage ledger.
export function aiProvider(
  pool: pg.Pool,
  env: NodeJS.ProcessEnv,
  scope: AiConsentChange['scope'],
): [ProviderSettings, Admission, Meter] {
  const { ai } = readConfig(env);
  const consent = createAiConsent(pool, ai);
  const usage = createTutoringUsage(pool, ai.monthlyBudget);
  return [
    providerSettings(ai, scope),
    {
      dispatch: (credentials, start) => consent.dispatch(credentials, scope, start),
      confirm: (credentials) => consent.confirm(credentials, scope),
    },
    {
      reserve: (credentials, model, amount) =>
        consent.withChildConsent(credentials, scope, (client, child) =>
          usage.reserve(client, child, model, amount),
        ),
      settle: usage.settle,
    },
  ];
}
