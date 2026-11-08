import type pg from 'pg';
import { providerAvailability } from './ai-provider-settings.js';
import { createTutoringUsage } from './ai/repositories/postgres-tutoring-usage.js';
import { childSessionTransaction } from './child-session-transaction.js';
import { createAiConsentService } from './identity/services/ai-consent.js';
import { parentSessionTransaction } from './parent-session-transaction.js';
import type { AiConfig } from './shared/config.js';

export function createAiConsent(pool: pg.Pool, config: AiConfig) {
  return createAiConsentService(
    parentSessionTransaction(pool),
    childSessionTransaction(pool),
    createTutoringUsage(pool, config.monthlyBudget).status,
    providerAvailability(config),
  );
}
