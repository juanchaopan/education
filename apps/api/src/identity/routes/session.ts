import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ParentLogin, ParentSession } from '@education/contracts';
import type { SessionService } from '../services/session.js';
import { RequestError } from '../../shared/request-error.js';
import { readSessionCookie, writeSessionCookie } from './session-cookie.js';

function serviceOrUnavailable(service?: SessionService) {
  if (!service) throw new RequestError(503, '登录服务尚未配置，请稍后再来。');
  return service;
}
function writeGuard(origin: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 'no-store');
    if (
      request.headers.origin !== origin ||
      request.headers['x-education-request'] !== 'session' ||
      request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json'
    )
      throw new RequestError(403, '请从本站家长页面提交。');
  };
}
export function registerParentSessions(
  app: FastifyInstance,
  origin: string,
  service?: SessionService,
) {
  const empty = Type.Object({}, { additionalProperties: false });
  app.post<{ Body: ParentLogin }>(
    '/api/v1/parents/login',
    {
      bodyLimit: 4096,
      onRequest: writeGuard(origin),
      schema: { body: ParentLogin, response: { 200: ParentSession } },
    },
    async (request, reply) => {
      const result = await serviceOrUnavailable(service).login(
        request.body,
        request.ip,
        readSessionCookie(request),
      );
      return reply
        .header('Set-Cookie', writeSessionCookie(result.token, result.maxAge))
        .send(result.view);
    },
  );
  app.get(
    '/api/v1/session',
    { schema: { querystring: empty, response: { 200: ParentSession } } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return serviceOrUnavailable(service).read(readSessionCookie(request), request.ip);
    },
  );
  app.post(
    '/api/v1/parents/logout',
    {
      bodyLimit: 4096,
      onRequest: writeGuard(origin),
      schema: { body: empty, response: { 204: Type.Null() } },
    },
    async (request, reply) => {
      await serviceOrUnavailable(service).logout(
        readSessionCookie(request),
        request.headers['x-csrf-token'] as string | undefined,
        request.ip,
      );
      return reply.header('Set-Cookie', writeSessionCookie('', 0)).code(204).send();
    },
  );
}
