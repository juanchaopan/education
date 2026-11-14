import { randomBytes } from 'node:crypto';
import type { ChildLogin, ChildSession } from '@education/contracts';
import type { AuthAdmission } from '../domain/authentication.js';
import { childLocator, childSessionLifetime } from '../domain/child-session.js';
import type { ChildSessionRepository } from '../repositories/child-session.js';
import { tokenHash, csrfToken, validToken, csrfMatches } from './session-security.js';
import { RequestError } from '../../shared/request-error.js';

type Dependencies = {
  repository: ChildSessionRepository;
  admit: AuthAdmission;
  material: (family: string, child: string, pin: string) => string;
  verify: (hash: string, material: string) => Promise<boolean>;
  dummyHash: string;
};
const denied = () =>
  new RequestError(
    401,
    '家庭码、昵称或 PIN 不正确，或登录已失效。请检查后重试，也可以请家长帮忙。',
  );
// Signing in spends the login budgets; reading the session, also on the way
// to logging out, does not. A session token is 32 random bytes that cannot be
// guessed, and reading one hashes no PIN, so counting reads would only lock
// out the children who come to sign in.
export function createChildSessionService(deps: Dependencies) {
  return {
    login: (input: ChildLogin, source: string, previous?: string) =>
      login(deps, input, source, previous),
    read: (token: string | undefined) => read(deps, token),
    logout: async (token: string | undefined, csrf: string | undefined) => {
      const view = await read(deps, token);
      if (!csrfMatches(csrf, view.csrfToken)) throw new RequestError(403, '请刷新页面后重试。');
      await deps.repository.revoke(tokenHash(token!));
    },
  };
}
async function login(deps: Dependencies, input: ChildLogin, source: string, previous?: string) {
  const { familyCode, nickname } = childLocator(input);
  return deps.admit(
    async () => {
      const account = await authenticate(deps, familyCode, nickname, input.pin);
      const token = randomBytes(32).toString('base64url');
      const issued = await deps.repository.issue(
        account,
        tokenHash(token),
        validToken(previous) ? tokenHash(previous) : undefined,
      );
      if (!issued) throw denied();
      return { token, maxAge: childSessionLifetime, view: viewFor(account.nickname, token) };
    },
    JSON.stringify([familyCode, nickname]),
    source,
    'child-login',
    familyCode,
  );
}
async function read(deps: Dependencies, token: string | undefined): Promise<ChildSession> {
  const account = validToken(token) ? await deps.repository.read(tokenHash(token)) : undefined;
  if (!account) throw denied();
  return viewFor(account.nickname, token!);
}
const viewFor = (nickname: string, token: string): ChildSession => ({
  role: 'child',
  nickname,
  csrfToken: csrfToken(token),
});
export type ChildSessionService = ReturnType<typeof createChildSessionService>;

async function authenticate(deps: Dependencies, family: string, nickname: string, pin: string) {
  const found = await deps.repository.find(family, nickname);
  const account = found?.pinPepperVersion === 1 ? found : undefined;
  const candidate = account ?? {
    familyId: 'unknown-family',
    id: 'unknown-child',
    pinHash: deps.dummyHash,
  };
  const material = deps.material(candidate.familyId, candidate.id, pin);
  const matches = await deps.verify(candidate.pinHash, material);
  if (!matches || !account) throw denied();
  return account;
}
