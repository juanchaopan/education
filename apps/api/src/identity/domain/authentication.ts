export type AuthAdmission = <T>(
  work: () => Promise<T>,
  email: string,
  source: string,
) => Promise<T>;
