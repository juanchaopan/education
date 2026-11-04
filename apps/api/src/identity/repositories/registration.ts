import type { AuthAdmission } from '../domain/authentication.js';

export type RegistrationRepository = {
  save: (email: string, passwordHash: string) => Promise<void>;
  admit: AuthAdmission;
};
