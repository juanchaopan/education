import type { ChildAccessReset, FamilyChildren } from '@education/contracts';

export type ChildAccessRepository = {
  list: (sessionHash: string) => Promise<FamilyChildren>;
  reset: (
    sessionHash: string,
    input: ChildAccessReset,
    hashPin: (family: string, child: string, currentHash: string) => Promise<string>,
  ) => Promise<void>;
};
