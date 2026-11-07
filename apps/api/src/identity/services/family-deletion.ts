import type pg from 'pg';
import {
  familyDeletionPhrase,
  type FamilyDeletionRequest,
  type FamilyDeletionResult,
} from '@education/contracts';
import type { DeletionLedger } from '../repositories/postgres-deletion-ledger.js';
import type { Credentials, ParentTransaction } from './parent-transaction.js';
import { RequestError } from '../../shared/request-error.js';

type Dependencies = {
  transaction: ParentTransaction;
  // A transaction of its own, for removing a family whose deletion is recorded.
  separately: (work: (client: pg.PoolClient) => Promise<void>) => Promise<void>;
  ledger: DeletionLedger;
  remove: (client: pg.PoolClient, familyId: string) => Promise<void>;
};

// The ledger may have stored the entry even when its reply was lost, and a
// stored entry is carried out later, so the parent is told how to tell.
const unrecorded = () =>
  new RequestError(
    503,
    '暂时无法确认删除是否已经受理，请稍后重新登录查看。如果还能登录，说明家庭没有删除，可以再试一次。',
  );

// The ledger entry is written before the family is removed, inside the
// transaction that holds the family lock, so no family is ever gone without an
// entry a restored backup can be cleared with. Removing the family and its
// sessions is one commit: once it lands, no server accepts the family's
// sessions. If that transaction fails after the entry is written, the removal
// is tried once more on its own; if that fails too, the deletion is pending
// and completePending finishes it.
export function createFamilyDeletionService({
  transaction,
  separately,
  ledger,
  remove,
}: Dependencies) {
  const removeRecorded = (familyId: string) => separately((client) => remove(client, familyId));

  async function removeSignedIn(credentials: Credentials) {
    const attempt: { recorded?: string } = {};
    try {
      await transaction(credentials, async (client, parent) => {
        if (!parent.recent) throw new RequestError(403, '请重新确认家长密码，再删除家庭。');
        await ledger.record(parent.familyId).catch(() => {
          throw unrecorded();
        });
        attempt.recorded = parent.familyId;
        await remove(client, parent.familyId);
      });
      return { familyId: attempt.recorded!, removed: true };
    } catch (error) {
      if (!attempt.recorded) throw error;
      const removed = await removeRecorded(attempt.recorded).then(
        () => true,
        () => false,
      );
      return { familyId: attempt.recorded, removed };
    }
  }

  return {
    async delete(
      credentials: Credentials,
      { confirmation }: FamilyDeletionRequest,
    ): Promise<FamilyDeletionResult> {
      if (confirmation !== familyDeletionPhrase)
        throw new RequestError(422, `请输入“${familyDeletionPhrase}”确认删除。`);
      const { familyId, removed } = await removeSignedIn(credentials);
      if (!removed) return { status: 'pending' };
      // A family that is gone but still pending in the ledger is completed by maintenance.
      await ledger.complete(familyId).catch(() => {});
      return { status: 'deleted' };
    },
    // Finishes recorded deletions in the order they were accepted. A family
    // that cannot be removed is counted and skipped, so it does not hold up the
    // families after it; removing and completing are idempotent, so the next
    // run retries it.
    async completePending(limit = 100) {
      const outcome = { completed: 0, failed: 0 };
      for (const familyId of await ledger.pending(limit)) {
        try {
          await removeRecorded(familyId);
          await ledger.complete(familyId);
          outcome.completed++;
        } catch {
          outcome.failed++;
        }
      }
      return outcome;
    },
  };
}

export type FamilyDeletionService = ReturnType<typeof createFamilyDeletionService>;
