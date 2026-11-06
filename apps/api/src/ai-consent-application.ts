import type pg from 'pg';
import { childSessionTransaction } from './child-session-transaction.js';
import { withParentSession } from './identity/repositories/session-transaction.js';
import { createAiConsentService } from './identity/services/ai-consent.js';
import {
  csrfMatches,
  csrfToken,
  tokenHash,
  validToken,
} from './identity/services/session-security.js';
import { RequestError } from './shared/request-error.js';

export function createAiConsent(pool: pg.Pool) {
  return createAiConsentService(({ token, csrf }, work) => {
    if (!validToken(token)) throw new RequestError(401, '登录已失效，请重新登录。');
    if (!csrfMatches(csrf, csrfToken(token))) throw new RequestError(403, '请刷新页面后重试。');
    return withParentSession(pool, tokenHash(token), work);
  }, childSessionTransaction(pool));
}
