import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { familyDeletionPhrase } from '@education/contracts';
import type { DeletionLedger } from '../repositories/postgres-deletion-ledger.js';
import type { AuthorizedParent } from '../repositories/session-transaction.js';
import { RequestError } from '../../shared/request-error.js';
import { createFamilyDeletionService } from './family-deletion.js';

const credentials = { token: 'session', csrf: 'csrf' };
const confirmed = { confirmation: familyDeletionPhrase };
const client = {} as pg.PoolClient;

type Options = {
  recent?: boolean;
  commit?: () => Promise<void>;
  refusal?: Error;
  failingRemovals?: number;
};

function setup({
  recent = true,
  commit = async () => {},
  refusal,
  failingRemovals = 0,
}: Options = {}) {
  const steps: string[] = [];
  const step = (name: string) => async (family: string) => {
    steps.push(`${name} ${family}`);
  };
  const ledger: DeletionLedger = {
    record: vi.fn(step('record')),
    complete: vi.fn(step('complete')),
    pending: vi.fn(async () => ['family-a', 'family-b']),
  };
  const parent = { familyId: 'family-1', recent } as AuthorizedParent;
  const opened = vi.fn();
  let failures = failingRemovals;
  const remove = vi.fn(async (_client: pg.PoolClient, family: string) => {
    if (failures-- > 0) throw new Error('database down');
    steps.push(`remove ${family}`);
  });
  const service = createFamilyDeletionService({
    async transaction(given, work) {
      opened(given);
      if (refusal) throw refusal;
      const result = await work(client, parent);
      await commit();
      steps.push('commit');
      return result;
    },
    async separately(work) {
      await work(client);
      steps.push('commit alone');
    },
    ledger,
    remove,
  });
  return { service, steps, ledger, opened, remove };
}

describe('family deletion', () => {
  it('records the family in the ledger, removes it in the same transaction, then completes it', async () => {
    const { service, steps, opened } = setup();
    await expect(service.delete(credentials, confirmed)).resolves.toEqual({ status: 'deleted' });
    expect(opened).toHaveBeenCalledWith(credentials);
    expect(steps).toEqual(['record family-1', 'remove family-1', 'commit', 'complete family-1']);
  });

  it('needs the exact phrase and a recent password before it records anything', async () => {
    const typo = setup();
    await expect(typo.service.delete(credentials, { confirmation: '删除' })).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(typo.opened).not.toHaveBeenCalled();
    const stale = setup({ recent: false });
    await expect(stale.service.delete(credentials, confirmed)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(stale.steps).toEqual([]);
  });

  it('leaves the family in place and says the outcome is unsure when the ledger fails', async () => {
    const { service, ledger, steps, remove } = setup();
    vi.mocked(ledger.record).mockRejectedValueOnce(new Error('ledger down'));
    await expect(service.delete(credentials, confirmed)).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining('重新登录查看'),
    });
    expect(steps).toEqual([]);
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes a recorded family on its own when the signed-in transaction does not commit', async () => {
    const { service, steps } = setup({
      commit: async () => {
        throw new Error('connection lost');
      },
    });
    await expect(service.delete(credentials, confirmed)).resolves.toEqual({ status: 'deleted' });
    expect(steps).toEqual([
      'record family-1',
      'remove family-1',
      'remove family-1',
      'commit alone',
      'complete family-1',
    ]);
  });

  it('reports a recorded deletion as pending when removing it fails twice', async () => {
    const { service, ledger } = setup({ failingRemovals: 2 });
    await expect(service.delete(credentials, confirmed)).resolves.toEqual({ status: 'pending' });
    expect(ledger.complete).not.toHaveBeenCalled();
  });

  it('reports the family as deleted when only marking the ledger entry complete fails', async () => {
    const { service, ledger } = setup();
    vi.mocked(ledger.complete).mockRejectedValueOnce(new Error('ledger down'));
    await expect(service.delete(credentials, confirmed)).resolves.toEqual({ status: 'deleted' });
  });

  it('passes session refusals through unchanged', async () => {
    const { service, ledger } = setup({
      refusal: new RequestError(401, '登录状态已失效，请重新登录。'),
    });
    await expect(service.delete(credentials, confirmed)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(ledger.record).not.toHaveBeenCalled();
  });

  it('completes pending deletions in ledger order', async () => {
    const { service, steps } = setup();
    await expect(service.completePending(10)).resolves.toEqual({ completed: 2, failed: 0 });
    expect(steps).toEqual([
      'remove family-a',
      'commit alone',
      'complete family-a',
      'remove family-b',
      'commit alone',
      'complete family-b',
    ]);
  });

  it('skips a family it cannot remove, so the families after it still finish', async () => {
    const { service, steps } = setup({ failingRemovals: 1 });
    await expect(service.completePending(10)).resolves.toEqual({ completed: 1, failed: 1 });
    expect(steps).toEqual(['remove family-b', 'commit alone', 'complete family-b']);
  });
});
