const known = new Set([
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

export function readinessErrorCode(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (typeof code === 'string' && known.has(code)) return code;
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return 'TIMEOUT';
  return 'UNKNOWN';
}
