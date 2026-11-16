import { createHmac } from 'node:crypto';
import { isIP, SocketAddress } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import type { AuthAdmission } from '../domain/authentication.js';
import { admissionBudgets, type Budget } from '../domain/admission-policy.js';
import { RequestError } from '../../shared/request-error.js';

const busy = () => new RequestError(429, '尝试较多，请稍后再试。');

// The stored name of a budget: an HMAC under the deployment's rate-limit key,
// so the table never holds an email, family code, nickname or address.
export const pseudonym = (secret: string, name: string) =>
  createHmac('sha256', secret).update(name).digest('hex');

// IPv6 addresses count by their /64 network, which one household or device
// usually holds whole; IPv4 addresses count one by one.
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

// Takes a place in every budget, or none when one of them is full. One
// database lock orders the reservations of every instance.
async function reserveBudgets(client: pg.PoolClient, budgets: Budget[]) {
  await drizzle(client).transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1717, 0)`);
    await tx.execute(
      sql`DELETE FROM registration_attempts WHERE attempted_at < now() - interval '25 hours'`,
    );
    for (const { name, recent, daily } of budgets) {
      const result = await tx.execute<{ recent: number; daily: number }>(sql`
        SELECT count(*) FILTER (WHERE attempted_at > now() - interval '15 minutes')::int AS recent,
          count(*)::int AS daily FROM registration_attempts
        WHERE bucket = ${name} AND attempted_at > now() - interval '24 hours'`);
      const count = result.rows[0]!;
      if (count.recent >= recent || count.daily >= daily) throw busy();
    }
    for (const { name } of budgets) {
      await tx.execute(sql`INSERT INTO registration_attempts (bucket) VALUES (${name})`);
    }
  });
}

// Password and PIN hashing runs in one of four slots shared by every instance.
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
  return async (work, identity, source, scope = 'authentication', family) => {
    if (active >= 2) throw busy();
    active++;
    let client: pg.PoolClient | undefined;
    try {
      client = await pool.connect();
      const budgets = admissionBudgets(scope, { identity, source: sourceGroup(source), family });
      await reserveBudgets(
        client,
        budgets.map((budget) => ({ ...budget, name: pseudonym(secret, budget.name) })),
      );
      await claimSlot(client);
      return await work();
    } finally {
      // Closing the dedicated connection releases session locks even after a query failure.
      client?.release(true);
      active--;
    }
  };
}
