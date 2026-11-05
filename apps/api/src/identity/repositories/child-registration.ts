import type { ChildRegistrationReceipt } from '@education/contracts';
export type ChildRegistrationAttempt = {
  requestHash: string;
  fingerprint: string;
  keyHash: string;
  nickname: string;
  canonical: string;
};
export type ChildRegistrationRepository = {
  redeem: (
    input: ChildRegistrationAttempt,
    hashPin: (family: string, child: string) => Promise<string>,
  ) => Promise<ChildRegistrationReceipt>;
};
