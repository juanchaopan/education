import { describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import { familyExportScope, type ExportedBook } from '@education/contracts';
import type { AuthorizedParent } from '../repositories/session-transaction.js';
import { createFamilyExportService } from './family-export.js';

const client = {} as pg.PoolClient;
const credentials = { token: 'token', csrf: 'csrf' };
const parent: AuthorizedParent = {
  id: 'parent',
  familyId: 'family',
  email: 'parent@example.test',
  passwordHash: 'private-password-hash',
  emailVerified: true,
  credentialVersion: 1,
  familyEpoch: 1,
  recent: true,
};

const book = (childId: string): ExportedBook => ({
  id: `${childId}-book`,
  grade: '一年级',
  subject: '数学',
  name: '规律',
  status: 'available',
  assignedAt: '2026-11-06T08:00:00.000Z',
  done: 1,
  total: 2,
  finished: false,
});

function exporter(signedIn: Partial<AuthorizedParent> = {}, account = familyAccount()) {
  const readAccount = vi.fn().mockResolvedValue(account);
  const childLearning = vi.fn(async (_client: pg.PoolClient, childId: string) => ({
    learning: [],
    variations: [],
    books: [book(childId)],
    drafts: [],
  }));
  const service = createFamilyExportService(
    (_credentials, work) => work(client, { ...parent, ...signedIn }),
    childLearning,
    readAccount,
    () => new Date('2026-11-07T12:00:00.000Z'),
  );
  return { service, readAccount, childLearning };
}

function familyAccount() {
  return {
    children: [
      { id: 'deer', nickname: '小鹿' },
      { id: 'rabbit', nickname: '小兔' },
    ],
    aiConsents: [
      {
        scope: 'openai-tutoring' as const,
        policyVersion: 1,
        granted: true,
        changedAt: '2026-11-01T08:00:00.000Z',
      },
    ],
  };
}

describe('family export', () => {
  it('asks for the parent password again before reading anything', async () => {
    const { service, readAccount, childLearning } = exporter({ recent: false });
    await expect(service(credentials)).rejects.toMatchObject({ statusCode: 403 });
    expect(readAccount).not.toHaveBeenCalled();
    expect(childLearning).not.toHaveBeenCalled();
  });

  it('describes its format and holds only the signed-in family', async () => {
    const { service, readAccount, childLearning } = exporter();
    const file = await service(credentials);
    expect(readAccount).toHaveBeenCalledWith(client, 'family');
    expect(childLearning.mock.calls.map(([, id]) => id)).toEqual(['deer', 'rabbit']);
    expect(file).toEqual({
      format: {
        name: 'education-family-export',
        version: 3,
        generatedAt: '2026-11-07T12:00:00.000Z',
        includes: [...familyExportScope.includes],
        excludes: [...familyExportScope.excludes],
      },
      parent: { email: 'parent@example.test', emailVerified: true },
      aiConsents: familyAccount().aiConsents,
      children: [
        { nickname: '小鹿', learning: [], variations: [], books: [book('deer')], drafts: [] },
        { nickname: '小兔', learning: [], variations: [], books: [book('rabbit')], drafts: [] },
      ],
    });
    expect(JSON.stringify(file)).not.toContain('private-password-hash');
  });

  it('exports a family with no children or AI decisions yet', async () => {
    const { service, childLearning } = exporter({}, { children: [], aiConsents: [] });
    const file = await service(credentials);
    expect(file.children).toEqual([]);
    expect(file.aiConsents).toEqual([]);
    expect(childLearning).not.toHaveBeenCalled();
  });
});
