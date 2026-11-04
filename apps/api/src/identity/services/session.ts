import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
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
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const csrfToken = (token: string) =>
  createHmac('sha256', token).update('education-csrf-v1').digest('base64url');
const validToken = (token: string | undefined): token is string =>
  typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
const denied = () => new RequestError(401, '邮箱或密码不正确，或登录状态已失效。');

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
  const read = async (token: string | undefined, source: string): Promise<ParentSession> => {
    if (!validToken(token)) return reject(source);
    const account = await repository.read(tokenHash(token));
    if (!account) return reject(source);
    return {
      role: 'parent',
      email: account.email,
      emailVerified: account.emailVerified,
      access: account.access,
      csrfToken: csrfToken(token),
    };
  };
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
    const session = await read(token, source);
    if (!validToken(csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(session.csrfToken)))
      return reject(source, 403);
    await repository.revoke(tokenHash(token!));
  };
  return { login, read, logout };
}
export type SessionService = ReturnType<typeof createSessionService>;
