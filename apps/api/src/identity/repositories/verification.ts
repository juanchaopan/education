import type { VerificationAction, VerificationStatus } from '@education/contracts';
import type { MailOutcome } from '../../shared/gmail.js';
export type VerificationDraft = { id: string; tokenHash: string; payload: string };
export type VerificationDelivery = VerificationDraft & { email: string };
export type VerificationRepository = {
  reserve: (
    email: string,
    mode: VerificationAction['action'],
    draft: VerificationDraft,
  ) => Promise<VerificationDelivery>;
  finish: (id: string, outcome: MailOutcome) => Promise<void>;
  consume: (hash: string) => Promise<boolean>;
  status: (email: string) => Promise<VerificationStatus>;
};
