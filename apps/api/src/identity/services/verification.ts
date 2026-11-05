import type { AuthAdmission } from '../domain/authentication.js';
import { randomBytes, randomUUID } from 'node:crypto';
import type { VerificationAction } from '@education/contracts';
import type { VerificationRepository } from '../repositories/verification.js';
import type { MailSender, MailOutcome } from '../../shared/gmail.js';
import type { createMailPayload } from '../../shared/mail-payload.js';
import { RequestError } from '../../shared/request-error.js';
import { tokenHash, validToken } from './session-security.js';

type Dependencies = {
  admit: AuthAdmission;
  repository: VerificationRepository;
  sender: MailSender;
  payload: ReturnType<typeof createMailPayload>;
};
export function createVerificationService({ repository, sender, payload, admit }: Dependencies) {
  return {
    status: repository.status,
    send: async (email: string, mode: VerificationAction['action']) => {
      const token = randomBytes(32).toString('base64url');
      const id = randomUUID();
      const intent = await repository.reserve(email, mode, {
        id,
        tokenHash: tokenHash(token),
        payload: payload.seal(id, token),
      });
      let outcome: MailOutcome;
      try {
        outcome = await sender.send(intent.email, payload.open(intent.id, intent.payload));
      } catch {
        outcome = 'unknown';
      }
      await repository.finish(intent.id, outcome);
      return outcome;
    },
    consume: async (token: string, source: string) =>
      admit(
        async () => {
          if (!validToken(token) || !(await repository.consume(tokenHash(token))))
            throw new RequestError(
              400,
              '验证链接已失效或已使用。请登录家长账号，重新发送验证邮件。',
            );
          return { status: 'verified' as const };
        },
        '',
        source,
      ),
  };
}
export type VerificationService = ReturnType<typeof createVerificationService>;
