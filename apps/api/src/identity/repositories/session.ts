import type { ParentAccount, SessionAccount } from '../domain/session.js';
export type SessionRepository = {
  find: (email: string) => Promise<ParentAccount | undefined>;
  issue: (account: ParentAccount, hash: string, previousHash?: string) => Promise<boolean>;
  read: (hash: string) => Promise<SessionAccount | undefined>;
  revoke: (hash: string) => Promise<void>;
};
