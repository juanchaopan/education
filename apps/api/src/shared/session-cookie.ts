import type { FastifyRequest } from 'fastify';
export const sessionCookie = '__Host-education_session';
export function readSessionCookie(request: FastifyRequest) {
  const values = (request.headers.cookie ?? '')
    .split(';')
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${sessionCookie}=`));
  return values.length === 1 ? values[0]!.slice(sessionCookie.length + 1) : undefined;
}
// The session token and the CSRF token a signed-in request carries. A repeated
// CSRF header arrives as an array and counts as missing.
export function readSessionCredentials(request: FastifyRequest) {
  const csrf = request.headers['x-csrf-token'];
  return { token: readSessionCookie(request), csrf: typeof csrf === 'string' ? csrf : undefined };
}
export function writeSessionCookie(value: string, maxAge: number) {
  return `${sessionCookie}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
