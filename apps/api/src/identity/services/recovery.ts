import { randomBytes, randomUUID } from 'node:crypto';
import { passwordIssue, type RecoveryRequest, type PasswordReset } from '@education/contracts';
import type { RecoveryRepository } from '../repositories/recovery.js';
import type { AuthAdmission } from '../domain/authentication.js';
import type { MailSender, MailOutcome } from '../../shared/gmail.js';
import type { createMailPayload } from '../../shared/mail-payload.js';
import { emailIssue } from '../domain/email.js';
import { RequestError } from '../../shared/request-error.js';
import { tokenHash, validToken } from './session-security.js';
type Dependencies = {
  repository: RecoveryRepository;
  sender: MailSender;
  admit: AuthAdmission;
  hash: (password: string) => Promise<string>;
  payload: ReturnType<typeof createMailPayload>;
  wait?: (ms: number) => Promise<void>;
};
export function createRecoveryService({
  repository,
  sender,
  admit,
  hash,
  payload,
  wait = pause,
}: Dependencies) {
  return {
    request: async (input: RecoveryRequest, source: string) => {
      const issue = emailIssue(input.email.trim().toLowerCase());
      if (issue) throw new RequestError(400, issue);
      // The same response floor covers normal SMTP latency for absent, throttled and real accounts.
      const floor = wait(20000);
      try {
        await deliver({ repository, sender, admit, payload, hash }, input, source);
      } catch {
        /* The public receipt must not expose account, quota or delivery state. */
      } finally {
        await floor;
      }
      return { status: 'requested' as const };
    },
    reset: (input: PasswordReset, source: string) =>
      admit(
        async () => {
          const issue = passwordIssue(input.password);
          if (issue || Buffer.byteLength(input.password, 'utf8') > 512)
            throw new RequestError(400, issue ?? '密码最多 512 字节。');
          if (
            !validToken(input.token) ||
            !(await repository.consume(tokenHash(input.token), await hash(input.password)))
          )
            throw new RequestError(400, '恢复链接已失效或已使用，请重新申请。');
          return { status: 'reset' as const };
        },
        '',
        source,
      ),
  };
}
export type RecoveryService = ReturnType<typeof createRecoveryService>;

async function deliver(
  { repository, sender, admit, payload }: Dependencies,
  input: RecoveryRequest,
  source: string,
) {
  const email = input.email.trim().toLowerCase();
  const intent = await admit(
    async () => {
      const id = randomUUID(),
        token = randomBytes(32).toString('base64url');
      return repository.reserve(email, input.action, {
        id,
        tokenHash: tokenHash(token),
        payload: payload.seal(id, token),
      });
    },
    email,
    source,
  );
  if (!intent) return;
  let outcome: MailOutcome;
  try {
    outcome = await sender.send(intent.email, payload.open(intent.id, intent.payload));
  } catch {
    outcome = 'unknown';
  }
  await repository.finish(intent.id, outcome);
}

function pause(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
