import { randomBytes } from 'node:crypto';
import type { AuthAdmission } from '../domain/authentication.js';
import type { ReauthenticationRepository } from '../repositories/reauthentication.js';
import type { SessionService } from './session.js';
import { authorizeParent } from './parent-authorization.js';
import { tokenHash, csrfToken } from './session-security.js';
import { RequestError } from '../../shared/request-error.js';

type Dependencies = {
  sessions: Pick<SessionService, 'read'>;
  repository: ReauthenticationRepository;
  admit: AuthAdmission;
  verify: (hash: string, password: string) => Promise<boolean>;
};
export function createReauthenticationService({
  sessions,
  repository,
  admit,
  verify,
}: Dependencies) {
  return {
    confirm: async (
      previous: string | undefined,
      csrf: string | undefined,
      password: string,
      source: string,
    ) => {
      const session = await authorizeParent(sessions, previous, source, csrf ?? '');
      return admit(
        async () => {
          const account = await repository.find(session.email);
          if (
            !account ||
            Buffer.byteLength(password, 'utf8') > 512 ||
            !(await verify(account.passwordHash, password))
          )
            throw new RequestError(401, '密码不正确，或登录状态已失效。');
          const token = randomBytes(32).toString('base64url');
          const maxAge = await repository.confirm(account, tokenHash(previous!), tokenHash(token));
          if (!maxAge || maxAge <= 0) throw new RequestError(401, '登录状态已失效，请重新登录。');
          return { token, maxAge, view: { ...session, csrfToken: csrfToken(token) } };
        },
        session.email,
        source,
      );
    },
  };
}
export type ReauthenticationService = ReturnType<typeof createReauthenticationService>;
