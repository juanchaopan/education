import type { FastifyRequest, FastifyReply } from 'fastify';
import { RequestError } from './request-error.js';

export function sessionWriteGuard(origin: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 'no-store');
    if (
      request.headers.origin !== origin ||
      request.headers['x-education-request'] !== 'session' ||
      request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json'
    )
      throw new RequestError(403, '请从本站页面提交。');
  };
}
