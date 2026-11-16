export type AuthScope =
  | 'authentication'
  | 'parent-login'
  | 'recovery'
  | 'child-registration'
  | 'child-login'
  | 'child-reset';
export type AuthAdmission = <T>(
  work: () => Promise<T>,
  identity: string,
  source: string,
  scope?: AuthScope,
  family?: string,
) => Promise<T>;
