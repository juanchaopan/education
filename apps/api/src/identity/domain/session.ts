export type ParentAccount = {
  id: string;
  familyId: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  credentialVersion: number;
  familyEpoch: number;
};
export type SessionAccount = Pick<ParentAccount, 'email' | 'emailVerified'> & {
  access: 'verified' | 'verification-only';
};
export const sessionLifetime = (verified: boolean) => (verified ? 7 * 24 * 60 * 60 : 15 * 60);
