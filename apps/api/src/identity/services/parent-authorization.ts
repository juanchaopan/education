import type { SessionService } from './session.js';
import { csrfMatches } from './session-security.js';
import { RequestError } from '../../shared/request-error.js';

export async function authorizeParent(
  sessions: Pick<SessionService, 'read'>,
  token: string | undefined,
  source: string,
  csrf?: string,
) {
  const session = await sessions.read(token, source);
  if (session.access !== 'verified') throw new RequestError(403, '请先验证邮箱并重新登录。');
  if (csrf !== undefined && !csrfMatches(csrf, session.csrfToken))
    throw new RequestError(403, '请刷新页面后重试。');
  return session;
}
