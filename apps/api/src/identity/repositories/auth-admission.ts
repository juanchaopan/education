import { createHmac } from 'node:crypto';
import { isIP, SocketAddress } from 'node:net';
import type pg from 'pg';
import { authenticationBusy, authenticationBusyMessage } from '@education/contracts';
import type { AuthAdmission } from '../domain/authentication.js';
import {
  admissionPolicy,
  failureWatch,
  type AdmissionPolicy,
  type Budget,
} from '../domain/admission-policy.js';
import { inTransaction } from './transaction.js';
import { RequestError } from '../../shared/request-error.js';

const limited = () => new RequestError(429, '尝试较多，请稍后再试。');
const busy = () => new RequestError(429, authenticationBusyMessage, authenticationBusy, 5);

// The stored name of a budget: an HMAC under the deployment's rate-limit key,
// so the table never holds an email, family code, nickname or address.
export const pseudonym = (secret: string, name: string) =>
  createHmac('sha256', secret).update(name).digest('hex');

// More failed sign-ins in one 15-minute window than the watch allows: how many,
// and when the window began.
export type FailureWarning = { failures: number; windowStart: string };

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

// One database lock, held to the end of a transaction, orders every
// instance's changes to the attempt rows.
const lockAttempts = (client: pg.PoolClient) =>
  client.query('SELECT pg_advisory_xact_lock(1717, 0)');

const inAttemptLock = <T>(client: pg.PoolClient, work: () => Promise<T>) =>
  inTransaction(client, async () => {
    await lockAttempts(client);
    return work();
  });

// Empties a budget within a transaction the caller holds, such as resetting a
// child's PIN.
export async function emptyBudget(client: pg.PoolClient, secret: string, name: string) {
  await lockAttempts(client);
  await client.query('DELETE FROM registration_attempts WHERE bucket=$1', [
    pseudonym(secret, name),
  ]);
}

// Takes a place in every budget, or none when one of them is full, and
// returns the moment the places were taken.
function reserveBudgets(client: pg.PoolClient, budgets: Budget[]) {
  const names = budgets.map(({ name }) => name);
  return inAttemptLock(client, async () => {
    await client.query(
      "DELETE FROM registration_attempts WHERE attempted_at < now() - interval '25 hours'",
    );
    const counts = await client.query<{ bucket: string; recent: number; daily: number }>(
      `SELECT bucket, count(*) FILTER (WHERE attempted_at > now() - interval '15 minutes')::int AS recent,
         count(*)::int AS daily FROM registration_attempts
       WHERE bucket = ANY($1::text[]) AND attempted_at > now() - interval '24 hours' GROUP BY bucket`,
      [names],
    );
    const used = new Map(counts.rows.map((row) => [row.bucket, row]));
    const full = ({ name, recent, daily }: Budget) => {
      const count = used.get(name);
      return !!count && (count.recent >= recent || count.daily >= daily);
    };
    if (budgets.some(full)) throw limited();
    const inserted = await client.query<{ at: string }>(
      'INSERT INTO registration_attempts (bucket) SELECT unnest($1::text[]) RETURNING attempted_at::text AS at',
      [names],
    );
    return inserted.rows[0]!.at;
  });
}

// Gives back one place in each named budget taken at `at` and, after a
// sign-in, empties the budget of the account signed in to.
function giveBack(client: pg.PoolClient, names: string[], at: string, emptied?: string) {
  return inAttemptLock(client, () =>
    client.query(
      `DELETE FROM registration_attempts WHERE ctid IN (
         SELECT DISTINCT ON (bucket) ctid FROM registration_attempts
         WHERE bucket = ANY($1::text[]) AND attempted_at = $2::timestamptz)
       OR bucket = $3`,
      [names, at, emptied ?? null],
    ),
  );
}

// Counts one failure for the whole site. The first failure past the threshold
// in a window marks the window as warned and returns the warning; once a
// window is marked, failures in it are not counted again on any instance.
function watchFailure(client: pg.PoolClient, failures: string, warned: string) {
  return inAttemptLock(client, async (): Promise<FailureWarning | undefined> => {
    const window = (
      await client.query<{ start: string; warned: boolean; failures: number }>(
        `SELECT w.start::text AS start,
           EXISTS (SELECT 1 FROM registration_attempts WHERE bucket = $2 AND attempted_at = w.start) AS warned,
           (SELECT count(*)::int FROM registration_attempts WHERE bucket = $1 AND attempted_at >= w.start) AS failures
         FROM (SELECT date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') AS start) w`,
        [failures, warned],
      )
    ).rows[0]!;
    if (window.warned) return undefined;
    await client.query(
      'DELETE FROM registration_attempts WHERE bucket = $1 AND attempted_at < $2::timestamptz',
      [failures, window.start],
    );
    await client.query('INSERT INTO registration_attempts (bucket) VALUES ($1)', [failures]);
    const count = window.failures + 1;
    if (count <= failureWatch.threshold) return undefined;
    await client.query(
      'INSERT INTO registration_attempts (bucket, attempted_at) VALUES ($1, $2::timestamptz)',
      [warned, window.start],
    );
    return { failures: count, windowStart: window.start };
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

// Runs a sign-in whose places only a failure keeps. A failure, including an
// error after the places were taken, keeps its places. Bookkeeping that fails
// is let go: the attempt's own outcome is what the family sees, and a place
// not given back counts more, never less.
async function countingFailures<T>(
  work: () => Promise<T>,
  failed: () => Promise<unknown>,
  succeeded: () => Promise<unknown>,
) {
  let result: T;
  try {
    result = await work();
  } catch (error) {
    await failed().catch(() => undefined);
    throw error;
  }
  await succeeded().catch(() => undefined);
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
  const watched = { failures: stored(failureWatch.name), warned: stored(failureWatch.warned) };
  const admitOn = async <T>(
    client: pg.PoolClient,
    work: () => Promise<T>,
    policy: AdmissionPolicy,
  ) => {
    const budgets = policy.budgets.map((budget) => ({ ...budget, name: stored(budget.name) }));
    const names = budgets.map(({ name }) => name);
    const at = await reserveBudgets(client, budgets);
    if (!(await claimSlot(client))) {
      await giveBack(client, names, at);
      throw busy();
    }
    if (policy.counts === 'every-attempt') return work();
    return countingFailures(
      work,
      async () => {
        const warning = await watchFailure(client, watched.failures, watched.warned);
        if (warning) warn(warning);
      },
      () => giveBack(client, names, at, policy.account && stored(policy.account)),
    );
  };
  return async (work, identity, source, scope = 'authentication', family) => {
    if (active >= 2) throw busy();
    active++;
    let client: pg.PoolClient | undefined;
    try {
      client = await pool.connect();
      const policy = admissionPolicy(scope, { identity, source: sourceGroup(source), family });
      return await admitOn(client, work, policy);
    } finally {
      // Closing the dedicated connection releases session locks even after a query failure.
      client?.release(true);
      active--;
    }
  };
}
