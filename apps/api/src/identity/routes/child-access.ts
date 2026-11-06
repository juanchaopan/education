import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { FamilyChildren, ChildAccessReset } from '@education/contracts';
import type { ChildAccessService } from '../services/child-access.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import { readSessionCookie } from '../../shared/session-cookie.js';
import { RequestError } from '../../shared/request-error.js';

const empty = Type.Object({}, { additionalProperties: false });
export function registerChildAccess(
  app: FastifyInstance,
  origin: string,
  service?: ChildAccessService,
) {
  const available = () => {
    if (!service) throw new RequestError(503, '孩子访问管理暂时无法使用，请稍后再试。');
    return service;
  };
  app.get(
    '/api/v1/parents/children',
    {
      schema: { querystring: empty, response: { 200: FamilyChildren } },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return available().list(readSessionCookie(request), request.ip);
    },
  );
  app.post<{ Body: ChildAccessReset }>(
    '/api/v1/parents/children/reset-pin',
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(origin),
      schema: { body: ChildAccessReset, querystring: empty, response: { 204: Type.Null() } },
    },
    async (request, reply) => {
      await available().reset(
        readSessionCookie(request),
        request.headers['x-csrf-token'] as string | undefined,
        request.body,
        request.ip,
      );
      return reply.code(204).send();
    },
  );
}
