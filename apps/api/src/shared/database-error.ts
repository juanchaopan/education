import pg from 'pg';

// Connection and certificate failures from Node, and the PostgreSQL states a
// connection can end in before any query runs.
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

export function errorCode(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return typeof code === 'string' ? code : undefined;
}

// The part of a database failure that is safe to log: the SQLSTATE PostgreSQL
// answered with, a known connection code, or TIMEOUT. Anything else is not
// recognised as a database failure. The message is read only to spot a
// timeout, never logged: it can hold a connection string or a child's input.
export function databaseErrorCode(error: unknown): string | undefined {
  const code = errorCode(error);
  if (error instanceof pg.DatabaseError && code) return code;
  if (code && connectionCodes.has(code)) return code;
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return 'TIMEOUT';
}
