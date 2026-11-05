import type { ChildAccount } from '../domain/child-session.js';

export type ChildSessionRepository = {
  find: (familyCode: string, nickname: string) => Promise<ChildAccount | undefined>;
  issue: (account: ChildAccount, hash: string, previousHash?: string) => Promise<boolean>;
  read: (hash: string) => Promise<{ nickname: string } | undefined>;
  revoke: (hash: string) => Promise<void>;
};
