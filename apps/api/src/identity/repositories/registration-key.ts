import type { RegistrationKeyInfo, RegistrationKeyStatus } from '@education/contracts';
export type RegistrationKeyRepository = {
  read: (sessionHash: string) => Promise<RegistrationKeyStatus>;
  generate: (sessionHash: string, keyHash: string) => Promise<RegistrationKeyInfo>;
  revoke: (sessionHash: string, id: string) => Promise<void>;
};
