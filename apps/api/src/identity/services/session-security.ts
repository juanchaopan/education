import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const csrfToken = (token: string) =>
  createHmac('sha256', token).update('education-csrf-v1').digest('base64url');
export const validToken = (token: string | undefined): token is string =>
  typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
export const csrfMatches = (actual: string | undefined, expected: string) =>
  validToken(actual) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
