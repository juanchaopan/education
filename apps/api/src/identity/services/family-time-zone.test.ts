import { describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import type { AuthorizedParent } from '../repositories/session-transaction.js';
import { createFamilyTimeZoneService } from './family-time-zone.js';

const credentials = { token: 'token', csrf: 'csrf' };
const parent = { familyId: 'family' } as AuthorizedParent;

// A family row as the database holds it, and every statement run against it.
function family(timeZone: string | null) {
  const query = vi.fn(async (_text: string, _values: unknown[]) => ({
    rows: [{ time_zone: timeZone }],
  }));
  const client = { query } as unknown as pg.PoolClient;
  const service = createFamilyTimeZoneService(
    (_credentials, work) => work(client, parent),
    async () => timeZone,
    'Asia/Shanghai',
  );
  return { service, query };
}

describe('the family time zone', () => {
  it("reads the family's own zone as set", async () => {
    const { service } = family('America/Toronto');
    expect(await service.read(credentials)).toEqual({ timeZone: 'America/Toronto', set: true });
  });

  it('reads the default zone, not set, until a device fills it in', async () => {
    const { service } = family(null);
    expect(await service.read(credentials)).toEqual({ timeZone: 'Asia/Shanghai', set: false });
  });

  it('saves a known zone in its usual spelling for the parent’s own family', async () => {
    const { service, query } = family(null);
    await service.change(credentials, { timeZone: 'europe/london' });
    expect(query).toHaveBeenLastCalledWith(expect.stringMatching(/^UPDATE families/), [
      'family',
      'Europe/London',
    ]);
  });

  it('turns away a name it does not know, or an offset, before opening the family', async () => {
    const transaction = vi.fn();
    const service = createFamilyTimeZoneService(transaction, async () => null, 'Asia/Shanghai');
    for (const timeZone of ['Mars/Olympus_Mons', '+08:00'])
      expect(() => service.change(credentials, { timeZone })).toThrow('没有找到这个时区');
    expect(transaction).not.toHaveBeenCalled();
  });

  it("gives a signed-in member the family's zone, or the default while it has none", async () => {
    expect(await family('Europe/London').service.forSession('token')).toEqual({
      timeZone: 'Europe/London',
    });
    expect(await family(null).service.forSession('token')).toEqual({ timeZone: 'Asia/Shanghai' });
  });
});
