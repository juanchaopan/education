import { createHmac } from 'node:crypto';
import type { ChildRegistration } from '@education/contracts';
import { childIdentity } from '../domain/child-registration.js';
import type { AuthAdmission } from '../domain/authentication.js';
import type { ChildRegistrationRepository } from '../repositories/child-registration.js';
import { RequestError } from '../../shared/request-error.js';
import { tokenHash } from './session-security.js';

export function createChildRegistrationService(options: {
  repository: ChildRegistrationRepository;
  admit: AuthAdmission;
  hashPin: (family: string, child: string, pin: string) => Promise<string>;
  fingerprintKey: string;
}) {
  return async (input: ChildRegistration, source: string) => {
    let identity;
    try {
      identity = childIdentity(input);
    } catch (error) {
      throw new RequestError(400, (error as Error).message);
    }
    const { key, nickname, canonical, pin } = identity;
    const keyedHash = (value: string) =>
      createHmac('sha256', options.fingerprintKey).update(value).digest('hex');
    return options.admit(
      () =>
        options.repository.redeem(
          {
            requestHash: keyedHash(`child-request:${input.requestId}`),
            fingerprint: keyedHash(
              JSON.stringify(['child-registration', key, nickname, canonical, pin]),
            ),
            keyHash: tokenHash(key),
            nickname,
            canonical,
          },
          (family, child) => options.hashPin(family, child, pin),
        ),
      tokenHash(key),
      source,
      'child-registration',
    );
  };
}
export type ChildRegistrationService = ReturnType<typeof createChildRegistrationService>;
