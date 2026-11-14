import { randomBytes } from 'node:crypto';
import { tokenHash, csrfToken, validToken, csrfMatches } from './session-security.js';
import type { ParentLogin, ParentSession } from '@education/contracts';
import type { SessionRepository } from '../repositories/session.js';
import type { AuthAdmission } from '../domain/authentication.js';
import { sessionLifetime } from '../domain/session.js';
import { RequestError } from '../../shared/request-error.js';

type Dependencies = {
  repository: SessionRepository;
  admit: AuthAdmission;
  verify: (hash: string, password: string) => Promise<boolean>;
  dummyHash: string;
};
const denied = () => new RequestError(401, '邮箱或密码不正确，或登录状态已失效。');

// The live session a token stands for, or undefined.
async function findSession(
  repository: SessionRepository,
  token: string | undefined,
): Promise<ParentSession | undefined> {
  if (!validToken(token)) return undefined;
  const account = await repository.read(tokenHash(token));
  if (!account) return undefined;
  return {
    role: 'parent',
    email: account.email,
    emailVerified: account.emailVerified,
    access: account.access,
    csrfToken: csrfToken(token),
  };
}

// `current` reads the session a page asks about, also on the way to logging
// out, without spending the login budgets: a session token is 32 random bytes
// that cannot be guessed, and reading one hashes no password. `read`, which
// lets a parent into the parent endpoints, spends them for a missing session.
export function createSessionService({ repository, admit, verify, dummyHash }: Dependencies) {
  const reject = (source: string, status = 401): Promise<never> =>
    admit(
      async () => {
        if (status === 403) throw new RequestError(403, '请刷新页面后重试。');
        throw denied();
      },
      '',
      source,
    );
  const current = async (token: string | undefined) => {
    const session = await findSession(repository, token);
    if (!session) throw denied();
    return session;
  };
  const read = async (token: string | undefined, source: string) =>
    (await findSession(repository, token)) ?? reject(source);
  const login = async (input: ParentLogin, source: string, previous?: string) => {
    const email = input.email.trim().toLowerCase();
    return admit(
      async () => {
        const account = await repository.find(email);
        const matches = await verify(account?.passwordHash ?? dummyHash, input.password);
        if (!matches || !account) throw denied();
        const token = randomBytes(32).toString('base64url');
        const issued = await repository.issue(
          account,
          tokenHash(token),
          validToken(previous) ? tokenHash(previous) : undefined,
        );
        if (!issued) throw denied();
        const view: ParentSession = {
          role: 'parent',
          email: account.email,
          emailVerified: account.emailVerified,
          access: account.emailVerified ? 'verified' : 'verification-only',
          csrfToken: csrfToken(token),
        };
        return { token, view, maxAge: sessionLifetime(account.emailVerified) };
      },
      email,
      source,
    );
  };
  const logout = async (token: string | undefined, csrf: string | undefined, source: string) => {
    const session = await current(token);
    if (!csrfMatches(csrf, session.csrfToken)) return reject(source, 403);
    await repository.revoke(tokenHash(token!));
  };
  return { login, current, read, logout };
}
export type SessionService = ReturnType<typeof createSessionService>;
