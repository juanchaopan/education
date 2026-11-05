import { groupRegistrationCode } from '../domain/registration-code.js';
import { randomBytes } from 'node:crypto';
import type { RegistrationKeyRepository } from '../repositories/registration-key.js';
import type { SessionService } from './session.js';
import { authorizeParent } from './parent-authorization.js';
import { tokenHash } from './session-security.js';

export function generateRegistrationKey() {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  return groupRegistrationCode(Array.from(randomBytes(16), (byte) => alphabet[byte & 31]).join(''));
}
export function createRegistrationKeyService({
  sessions,
  repository,
}: {
  sessions: Pick<SessionService, 'read'>;
  repository: RegistrationKeyRepository;
}) {
  return {
    read: async (token: string | undefined, source: string) => {
      await authorizeParent(sessions, token, source);
      return repository.read(tokenHash(token!));
    },
    generate: async (token: string | undefined, csrf: string | undefined, source: string) => {
      await authorizeParent(sessions, token, source, csrf ?? '');
      const value = generateRegistrationKey();
      const key = await repository.generate(
        tokenHash(token!),
        tokenHash(value.replaceAll('-', '')),
      );
      return { key, value };
    },
    revoke: async (
      token: string | undefined,
      csrf: string | undefined,
      id: string,
      source: string,
    ) => {
      await authorizeParent(sessions, token, source, csrf ?? '');
      await repository.revoke(tokenHash(token!), id);
    },
  };
}
export type RegistrationKeyService = ReturnType<typeof createRegistrationKeyService>;
