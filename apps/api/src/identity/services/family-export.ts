import type pg from 'pg';
import { familyExportScope, type ChildExport, type FamilyExport } from '@education/contracts';
import { readFamilyAccount } from '../repositories/postgres-family-account.js';
import type { Credentials, ParentTransaction } from './parent-transaction.js';
import { RequestError } from '../../shared/request-error.js';

type ReadChildLearning = (
  client: pg.PoolClient,
  childId: string,
) => Promise<Omit<ChildExport, 'nickname'>>;

// The export is assembled inside the parent's session transaction, which locks
// the family and the session, so a revoked session or a deleted family yields
// no data at all. Nothing is stored: the file exists only in the response.
export function createFamilyExportService(
  transaction: ParentTransaction,
  readChildLearning: ReadChildLearning,
  readAccount: typeof readFamilyAccount = readFamilyAccount,
  now = () => new Date(),
) {
  return (credentials: Credentials): Promise<FamilyExport> =>
    transaction(credentials, async (client, parent) => {
      if (!parent.recent) throw new RequestError(403, '请重新确认家长密码，再导出家庭数据。');
      const account = await readAccount(client, parent.familyId);
      const children: ChildExport[] = [];
      for (const { id, nickname } of account.children)
        children.push({ nickname, ...(await readChildLearning(client, id)) });
      return {
        format: {
          name: 'education-family-export',
          version: 1,
          generatedAt: now().toISOString(),
          includes: [...familyExportScope.includes],
          excludes: [...familyExportScope.excludes],
        },
        parent: { email: parent.email, emailVerified: parent.emailVerified },
        aiConsents: account.aiConsents,
        children,
      };
    });
}

export type FamilyExportService = ReturnType<typeof createFamilyExportService>;
