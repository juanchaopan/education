export type AuthAdmission = <T>(
  work: () => Promise<T>,
  email: string,
  source: string,
  scope?: 'authentication' | 'recovery',
) => Promise<T>;
