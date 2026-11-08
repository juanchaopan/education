import pg from 'pg';

// Connection and certificate failures from Node, and the PostgreSQL states a
// connection can end in before any query runs. Mail and AI services catch their
// own network failures, so one of these reaching a request is the database's.
const connectionCodes = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'CERT_HAS_EXPIRED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  '28000',
  '28P01',
  '42501',
  '53300',
  '57P01',
  '42P01',
]);
// What the pg driver and pool say when a connection or a read takes too long.
const timeouts =
  /timeout exceeded when trying to connect|connection timeout|connection timed out|query read timeout/i;

export function errorCode(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return typeof code === 'string' ? code : undefined;
}

function causes(error: unknown) {
  const chain: unknown[] = [];
  for (let current = error; current && chain.length < 5; current = (current as Error).cause)
    chain.push(current);
  return chain;
}

function ownCode(error: unknown) {
  const code = errorCode(error);
  if (error instanceof pg.DatabaseError && code) return code;
  if (code && connectionCodes.has(code)) return code;
  if (error instanceof Error && timeouts.test(error.message)) return 'TIMEOUT';
}

// The part of a database failure that is safe to log: the SQLSTATE PostgreSQL
// answered with, a known connection code, or TIMEOUT. The query builder wraps
// driver errors, so the causes are read too. Anything else is not recognised as
// a database failure. Messages are read only to spot a timeout, never logged:
// they can hold a connection string, a query's parameters or a child's input.
export function databaseErrorCode(error: unknown): string | undefined {
  for (const candidate of causes(error)) {
    const code = ownCode(candidate);
    if (code) return code;
  }
}
