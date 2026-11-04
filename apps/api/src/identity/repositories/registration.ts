export type RegistrationRepository = {
  save: (email: string, passwordHash: string) => Promise<void>;
  admit: <T>(work: () => Promise<T>, email: string, source: string) => Promise<T>;
};
