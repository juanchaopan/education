import type pg from 'pg';
import { createTutoringUsage } from './ai/repositories/postgres-tutoring-usage.js';
import { childSessionTransaction } from './child-session-transaction.js';
import { createAiConsentService } from './identity/services/ai-consent.js';
import { parentSessionTransaction } from './parent-session-transaction.js';

export function createAiConsent(pool: pg.Pool, monthlyBudget: bigint | null = null) {
  return createAiConsentService(
    parentSessionTransaction(pool),
    childSessionTransaction(pool),
    createTutoringUsage(pool, monthlyBudget).status,
  );
}
