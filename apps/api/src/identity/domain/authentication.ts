export type AuthScope = 'authentication' | 'recovery' | 'child-registration' | 'child-login';
export type AuthAdmission = <T>(
  work: () => Promise<T>,
  identity: string,
  source: string,
  scope?: AuthScope,
  family?: string,
) => Promise<T>;
