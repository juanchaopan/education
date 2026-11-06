import type { FastifyRequest } from 'fastify';
export const sessionCookie = '__Host-education_session';
export function readSessionCookie(request: FastifyRequest) {
  const values = (request.headers.cookie ?? '')
    .split(';')
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${sessionCookie}=`));
  return values.length === 1 ? values[0]!.slice(sessionCookie.length + 1) : undefined;
}
export function writeSessionCookie(value: string, maxAge: number) {
  return `${sessionCookie}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
