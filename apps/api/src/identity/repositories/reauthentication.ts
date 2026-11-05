import type { ParentAccount } from '../domain/session.js';
export type ReauthenticationRepository = {
  find: (email: string) => Promise<ParentAccount | undefined>;
  confirm: (account: ParentAccount, previous: string, next: string) => Promise<number | undefined>;
};
