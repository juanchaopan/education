import type { AuthAdmission } from '../domain/authentication.js';

// A new family gets the parent's time zone when the sign-up page sent one the
// server knows; without it the family starts with none.
export type RegistrationRepository = {
  save: (email: string, passwordHash: string, timeZone?: string | null) => Promise<void>;
  admit: AuthAdmission;
};
