import type { ChildAccessReset } from '@education/contracts';
import type { ChildAccessRepository } from '../repositories/child-access.js';
import type { AuthAdmission } from '../domain/authentication.js';
import { validateChildPin } from '../domain/child-pin.js';
import type { SessionService } from './session.js';
import { authorizeParent } from './parent-authorization.js';
import { tokenHash } from './session-security.js';
import { RequestError } from '../../shared/request-error.js';

export function createChildAccessService(options: {
  repository: ChildAccessRepository;
  sessions: Pick<SessionService, 'read'>;
  admit: AuthAdmission;
  replacePin: (family: string, child: string, pin: string, currentHash: string) => Promise<string>;
}) {
  return {
    list: async (token: string | undefined, source: string) => {
      await authorizeParent(options.sessions, token, source);
      return options.repository.list(tokenHash(token!));
    },
    reset: async (
      token: string | undefined,
      csrf: string | undefined,
      input: ChildAccessReset,
      source: string,
    ) => {
      const parent = await authorizeParent(options.sessions, token, source, csrf ?? '');
      try {
        validateChildPin(input.pin);
      } catch (error) {
        throw new RequestError(400, (error as Error).message);
      }
      return options.admit(
        () =>
          options.repository.reset(tokenHash(token!), input, (family, child, currentHash) =>
            options.replacePin(family, child, input.pin, currentHash),
          ),
        parent.email,
        source,
        'child-reset',
      );
    },
  };
}
export type ChildAccessService = ReturnType<typeof createChildAccessService>;
