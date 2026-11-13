import {
  canonicalTimeZone,
  type ParentRegistration,
  type RegistrationReceipt,
} from '@education/contracts';
import { registrationIssue } from '../domain/registration.js';
import type { RegistrationRepository } from '../repositories/registration.js';
import { RequestError } from '../../shared/request-error.js';
import { isolatedMail, type RegistrationMail } from '../../shared/mail.js';

type Dependencies = RegistrationRepository & {
  hash: (password: string) => Promise<string>;
  mail?: RegistrationMail;
};

// A time zone the server does not know never stops a sign-up: the family
// starts without one and gets it from a parent's device later.
export function createRegistrationService(dependencies: Dependencies) {
  return async (input: ParentRegistration, source: string): Promise<RegistrationReceipt> => {
    const email = input.email.trim().toLowerCase();
    const issue = registrationIssue(email, input.password);
    if (issue) throw new RequestError(400, issue);
    const timeZone =
      input.timeZone === undefined ? null : (canonicalTimeZone(input.timeZone) ?? null);
    return dependencies.admit(
      async () => {
        const hash = await dependencies.hash(input.password);
        await dependencies.save(email, hash, timeZone);
        const mail = await (dependencies.mail ?? isolatedMail).requestVerification(email);
        return { status: 'pending-verification', mail };
      },
      email,
      source,
    );
  };
}
export type RegistrationService = ReturnType<typeof createRegistrationService>;
