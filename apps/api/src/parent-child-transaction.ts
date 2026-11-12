import type pg from 'pg';
import { parentSessionTransaction } from './parent-session-transaction.js';
import { RequestError } from './shared/request-error.js';

type Credentials = { token?: string; csrf?: string };

// Work for a signed-in parent on the whole family, given its children's ids
// in the order the parent space lists them, or on one of its children. A
// child of another family is answered as missing, saying nothing of whether
// it exists.
export function parentFamilyTransactions(pool: pg.Pool) {
  const parentTransaction = parentSessionTransaction(pool);
  return {
    family: <T>(
      credentials: Credentials,
      work: (client: pg.PoolClient, childIds: readonly string[]) => Promise<T>,
    ) =>
      parentTransaction(credentials, async (client, parent) => {
        const { rows } = await client.query<{ id: string }>(
          'SELECT id FROM children WHERE family_id=$1 ORDER BY nickname,id',
          [parent.familyId],
        );
        return work(
          client,
          rows.map(({ id }) => id),
        );
      }),
    child: <T>(
      credentials: Credentials,
      childId: string,
      work: (client: pg.PoolClient) => Promise<T>,
    ) =>
      parentTransaction(credentials, async (client, parent) => {
        const child = await client.query('SELECT 1 FROM children WHERE id=$1 AND family_id=$2', [
          childId,
          parent.familyId,
        ]);
        if (!child.rowCount) throw new RequestError(404, '没有找到这个孩子，请刷新孩子列表。');
        return work(client);
      }),
  };
}
