import type { VerificationDraft, VerificationDelivery } from './verification.js';
import type { RecoveryRequest } from '@education/contracts';
import type { MailOutcome } from '../../shared/gmail.js';
export type RecoveryRepository = {
  reserve: (
    email: string,
    action: RecoveryRequest['action'],
    draft: VerificationDraft,
  ) => Promise<VerificationDelivery | undefined>;
  finish: (id: string, outcome: MailOutcome) => Promise<void>;
  consume: (hash: string, passwordHash: string) => Promise<boolean>;
};
