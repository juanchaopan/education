import { createHmac } from 'node:crypto';
import { isIP, SocketAddress } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type pg from 'pg';
import { authenticationBusy } from '@education/contracts';
import type { AuthAdmission } from '../domain/authentication.js';
import { admissionPolicy, failureWatch, type Budget } from '../domain/admission-policy.js';
import { RequestError } from '../../shared/request-error.js';

const limited = () => new RequestError(429, '尝试较多，请稍后再试。');
const busy = () => new RequestError(429, '现在登录的人有点多，请过几秒再试。', authenticationBusy);

// The stored name of a budget: an HMAC under the deployment's rate-limit key,
// so the table never holds an email, family code, nickname or address.
export const pseudonym = (secret: string, name: string) =>
  createHmac('sha256', secret).update(name).digest('hex');

// More failed sign-ins in one 15-minute window than the watch allows: how many,
// and when the window began.
export type FailureWarning = { failures: number; windowStart: string };
type Watch = { failures: string; warned: string; warn: (warning: FailureWarning) => void };

// Places taken in budgets: their stored names and the moment they were taken.
type Reservation = { names: string[]; at: string };

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

// One database lock orders every instance's changes to the attempt rows.
type Transaction = Parameters<Parameters<ReturnType<typeof drizzle>['transaction']>[0]>[0];
async function inAttemptLock<T>(client: pg.PoolClient, work: (tx: Transaction) => Promise<T>) {
  return drizzle(client).transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1717, 0)`);
    return work(tx);
  });
}

// Takes a place in every budget, or none when one of them is full.
function reserveBudgets(client: pg.PoolClient, budgets: Budget[]) {
  return inAttemptLock(client, async (tx): Promise<Reservation> => {
    await tx.execute(
      sql`DELETE FROM registration_attempts WHERE attempted_at < now() - interval '25 hours'`,
    );
    for (const { name, recent, daily } of budgets) {
      const result = await tx.execute<{ recent: number; daily: number }>(sql`
        SELECT count(*) FILTER (WHERE attempted_at > now() - interval '15 minutes')::int AS recent,
          count(*)::int AS daily FROM registration_attempts
        WHERE bucket = ${name} AND attempted_at > now() - interval '24 hours'`);
      const count = result.rows[0]!;
      if (count.recent >= recent || count.daily >= daily) throw limited();
    }
    const at = (await tx.execute<{ at: string }>(sql`SELECT now()::text AS at`)).rows[0]!.at;
    for (const { name } of budgets) {
      await tx.execute(
        sql`INSERT INTO registration_attempts (bucket, attempted_at) VALUES (${name}, ${at}::timestamptz)`,
      );
    }
    return { names: budgets.map(({ name }) => name), at };
  });
}

// Gives back one place in each budget of a reservation and, after a sign-in,
// empties the budget of the account signed in to.
function giveBack(client: pg.PoolClient, { names, at }: Reservation, emptied?: string) {
  return inAttemptLock(client, async (tx) => {
    for (const name of names)
      await tx.execute(sql`
        DELETE FROM registration_attempts WHERE ctid IN (
          SELECT ctid FROM registration_attempts
          WHERE bucket = ${name} AND attempted_at = ${at}::timestamptz LIMIT 1)`);
    if (emptied) await tx.execute(sql`DELETE FROM registration_attempts WHERE bucket = ${emptied}`);
  });
}

// Counts one failure for the whole site. The first failure past the threshold
// in a window marks the window as warned and returns the warning; every other
// failure, on any instance, finds the mark or stays under the threshold.
function watchFailure(client: pg.PoolClient, watch: Watch) {
  return inAttemptLock(client, async (tx): Promise<FailureWarning | undefined> => {
    await tx.execute(sql`INSERT INTO registration_attempts (bucket) VALUES (${watch.failures})`);
    const windowStart = sql`date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00')`;
    const result = await tx.execute<{ failures: number; warned: number; window_start: string }>(sql`
      SELECT count(*) FILTER (WHERE bucket = ${watch.failures})::int AS failures,
        count(*) FILTER (WHERE bucket = ${watch.warned})::int AS warned,
        ${windowStart}::text AS window_start
      FROM registration_attempts
      WHERE bucket IN (${watch.failures}, ${watch.warned}) AND attempted_at >= ${windowStart}`);
    const { failures, warned, window_start } = result.rows[0]!;
    if (failures <= failureWatch.threshold || warned > 0) return undefined;
    await tx.execute(
      sql`INSERT INTO registration_attempts (bucket, attempted_at) VALUES (${watch.warned}, ${windowStart})`,
    );
    return { failures, windowStart: window_start };
  });
}

// Password and PIN hashing runs in one of four slots shared by every instance.
async function claimSlot(client: pg.PoolClient) {
  for (let slot = 0; slot < 4; slot++) {
    const result = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock(1718, $1) AS acquired',
      [slot],
    );
    if (result.rows[0]!.acquired) return true;
  }
  return false;
}

// Runs a sign-in whose reservation only a failure keeps. A failure, including
// an error after the password was checked, keeps its places and counts for the
// whole site. Bookkeeping that fails is let go: the attempt's own outcome is
// what the family sees, and a place not given back counts more, never less.
async function countingFailures<T>(
  client: pg.PoolClient,
  work: () => Promise<T>,
  reservation: Reservation,
  account: string | undefined,
  watch: Watch,
) {
  let result: T;
  try {
    result = await work();
  } catch (error) {
    const warning = await watchFailure(client, watch).catch(() => undefined);
    if (warning) watch.warn(warning);
    throw error;
  }
  await giveBack(client, reservation, account).catch(() => undefined);
  return result;
}

// Admits password and PIN checks by the budgets of their scope. A check that
// finds every hashing slot taken gives its places back and is refused as busy,
// since no password was checked.
export function createAuthAdmission(
  pool: pg.Pool,
  secret: string,
  warn: (warning: FailureWarning) => void = () => {},
): AuthAdmission {
  let active = 0;
  const stored = (name: string) => pseudonym(secret, name);
  const watch = { failures: stored(failureWatch.name), warned: stored(failureWatch.warned), warn };
  return async (work, identity, source, scope = 'authentication', family) => {
    if (active >= 2) throw busy();
    active++;
    let client: pg.PoolClient | undefined;
    try {
      client = await pool.connect();
      const policy = admissionPolicy(scope, { identity, source: sourceGroup(source), family });
      const reservation = await reserveBudgets(
        client,
        policy.budgets.map((budget) => ({ ...budget, name: stored(budget.name) })),
      );
      if (!(await claimSlot(client))) {
        await giveBack(client, reservation);
        throw busy();
      }
      if (policy.counts === 'every-attempt') return await work();
      const account = policy.account && stored(policy.account);
      return await countingFailures(client, work, reservation, account, watch);
    } finally {
      // Closing the dedicated connection releases session locks even after a query failure.
      client?.release(true);
      active--;
    }
  };
}
