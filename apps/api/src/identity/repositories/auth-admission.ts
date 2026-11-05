import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { SocketAddress } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import type { AuthAdmission, AuthScope } from '../domain/authentication.js';
import { RequestError } from '../../shared/request-error.js';

const busy = () => new RequestError(429, '尝试较多，请稍后再试。');

function sourceGroup(source: string) {
  if (isIP(source) !== 6) return source;
  const address = new SocketAddress({ address: source, family: 'ipv6' }).address;
  const [left, right] = address.split('::');
  if (right === undefined) return left!.split(':').slice(0, 4).join(':');
  const start = left ? left.split(':') : [];
  const end = right ? right.split(':') : [];
  return [...start, ...Array<string>(8 - start.length - end.length).fill('0'), ...end]
    .slice(0, 4)
    .join(':');
}

type Budget = { key: string; recent: number; daily: number };
async function reserveBudget(client: pg.PoolClient, budgets: Budget[]) {
  await drizzle(client).transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1717, 0)`);
    await tx.execute(
      sql`DELETE FROM registration_attempts WHERE attempted_at < now() - interval '25 hours'`,
    );
    for (const { key, recent, daily } of budgets) {
      const result = await tx.execute<{ recent: number; daily: number }>(sql`
        SELECT count(*) FILTER (WHERE attempted_at > now() - interval '15 minutes')::int AS recent,
          count(*)::int AS daily FROM registration_attempts
        WHERE bucket = ${key} AND attempted_at > now() - interval '24 hours'`);
      const count = result.rows[0]!;
      if (count.recent >= recent || count.daily >= daily) throw busy();
    }
    for (const { key } of budgets) {
      await tx.execute(sql`INSERT INTO registration_attempts (bucket) VALUES (${key})`);
    }
  });
}

async function claimSlot(client: pg.PoolClient) {
  for (let slot = 0; slot < 4; slot++) {
    const result = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock(1718, $1) AS acquired',
      [slot],
    );
    if (result.rows[0]!.acquired) return;
  }
  throw busy();
}

export function createAuthAdmission(pool: pg.Pool, secret: string): AuthAdmission {
  let active = 0;
  const bucket = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  return async (work, identity, source, scope = 'authentication') => {
    if (active >= 2) throw busy();
    active++;
    let client: pg.PoolClient | undefined;
    try {
      client = await pool.connect();
      await reserveBudget(client, admissionBudgets(scope, identity, source, bucket));
      await claimSlot(client);
      return await work();
    } finally {
      // Closing the dedicated connection releases session locks even after a query failure.
      client?.release(true);
      active--;
    }
  };
}

function admissionBudgets(
  scope: AuthScope,
  identity: string,
  source: string,
  bucket: (value: string) => string,
): Budget[] {
  const prefix = scope === 'authentication' ? '' : `${scope}:`;
  const redeem = scope === 'child-registration';
  return [
    { key: bucket(`${prefix}authentication`), recent: 100, daily: 500 },
    {
      key: bucket(`${prefix}ip:${sourceGroup(source)}`),
      recent: redeem ? 10 : 30,
      daily: redeem ? 50 : 200,
    },
    ...(identity
      ? [
          {
            key: bucket(`${prefix}${redeem ? 'key' : 'email'}:${identity}`),
            recent: redeem ? 5 : 10,
            daily: redeem ? 500 : 50,
          },
        ]
      : []),
  ];
}
