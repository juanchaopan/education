export type AuthScope = 'authentication' | 'recovery' | 'child-registration';
export type AuthAdmission = <T>(
  work: () => Promise<T>,
  identity: string,
  source: string,
  scope?: AuthScope,
) => Promise<T>;
