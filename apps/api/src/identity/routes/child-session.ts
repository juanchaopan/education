import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ChildLogin, ChildSession } from '@education/contracts';
import type { ChildSessionService } from '../services/child-session.js';
import { childSessionLifetime } from '../domain/child-session.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import { readSessionCookie, writeSessionCookie } from '../../shared/session-cookie.js';
import { RequestError } from '../../shared/request-error.js';

const empty = Type.Object({}, { additionalProperties: false });
function required(service?: ChildSessionService) {
  if (!service) throw new RequestError(503, '孩子登录服务暂时不可用，请稍后再来。');
  return service;
}
export function registerChildSessions(
  app: FastifyInstance,
  origin: string,
  service?: ChildSessionService,
) {
  app.post<{ Body: ChildLogin }>(
    '/api/v1/children/login',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(origin),
      schema: { querystring: empty, body: ChildLogin, response: { 200: ChildSession } },
    },
    async (request, reply) => {
      const result = await required(service).login(
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
    '/api/v1/children/session',
    { schema: { querystring: empty, response: { 200: ChildSession } } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      const token = readSessionCookie(request);
      const view = await required(service).read(token, request.ip);
      return reply
        .header('Set-Cookie', writeSessionCookie(token!, childSessionLifetime))
        .send(view);
    },
  );
  app.post(
    '/api/v1/children/logout',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(origin),
      schema: { querystring: empty, body: empty, response: { 204: Type.Null() } },
    },
    async (request, reply) => {
      await required(service).logout(
        readSessionCookie(request),
        request.headers['x-csrf-token'] as string | undefined,
        request.ip,
      );
      return reply.header('Set-Cookie', writeSessionCookie('', 0)).code(204).send();
    },
  );
}
