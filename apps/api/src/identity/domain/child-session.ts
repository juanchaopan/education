export const childSessionLifetime = 180 * 86400;
export type ChildAccount = {
  id: string;
  familyId: string;
  nickname: string;
  pinHash: string;
  pinPepperVersion: number | null;
  credentialVersion: number;
  familyEpoch: number;
};
export function childLocator(input: { familyCode: string; nickname: string }) {
  return {
    familyCode: input.familyCode.trim().replaceAll('-', '').toUpperCase(),
    nickname: input.nickname.normalize('NFKC').trim().toLowerCase(),
  };
}
