import type pg from 'pg';
import type { AiConsentChange } from '@education/contracts';
import { createAiConsent } from './ai-consent-application.js';
import { createTutoringUsage } from './ai/repositories/postgres-tutoring-usage.js';
import type { Admission, Meter, ProviderSettings } from './ai/services/metered-call.js';
import { readConfig } from './shared/config.js';

// Settings, consent and metering for one paid AI service. Each service has its
// own family consent scope and its own deployment eligibility flag; all share
// the paid AI switch, the API key and one usage ledger.
export function aiProvider(
  pool: pg.Pool,
  env: NodeJS.ProcessEnv,
  scope: AiConsentChange['scope'],
  eligibleFlag: string,
): [ProviderSettings, Admission, Meter] {
  const { paidAiEnabled, aiMonthlyBudget } = readConfig(env);
  const consent = createAiConsent(pool, aiMonthlyBudget);
  const usage = createTutoringUsage(pool, aiMonthlyBudget);
  return [
    {
      paidAiEnabled,
      apiKey: env.OPENAI_API_KEY?.trim() ?? '',
      eligible: env[eligibleFlag] === 'true',
    },
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
