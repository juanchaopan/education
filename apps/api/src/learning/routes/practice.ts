import { Type } from '@sinclair/typebox';
import { AssignPractice, PracticeChild, PracticePage, PracticeQuery } from '@education/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { RequestError } from '../../shared/request-error.js';
import { readSessionCookie } from '../../shared/session-cookie.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { PracticeService } from '../services/practice.js';

const parentPath = '/api/v1/parents/children/:childId/practice';
const readSchema = { querystring: PracticeQuery, response: { 200: PracticePage } };
function credentials(request: FastifyRequest, reply: FastifyReply) {
  reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
  const csrf = request.headers['x-csrf-token'];
  return { token: readSessionCookie(request), csrf: typeof csrf === 'string' ? csrf : undefined };
}

export function registerPractice(app: FastifyInstance, origin: string, service?: PracticeService) {
  const available = () => {
    if (!service) throw new RequestError(503, '暂时无法打开练习安排，请稍后重试。');
    return service;
  };
  app.get<{ Querystring: PracticeQuery }>(
    '/api/v1/children/practice',
    { schema: readSchema },
    (request, reply) =>
      available().forChild(credentials(request, reply), Number(request.query.offset ?? 0)),
  );
  app.get<{ Params: PracticeChild; Querystring: PracticeQuery }>(
    parentPath,
    { schema: { ...readSchema, params: PracticeChild } },
    (request, reply) =>
      available().forParent(
        credentials(request, reply),
        request.params.childId,
        Number(request.query.offset ?? 0),
      ),
  );
  app.post<{ Params: PracticeChild; Body: AssignPractice }>(
    parentPath,
    {
      bodyLimit: 4096,
      onRequest: sessionWriteGuard(origin),
      schema: {
        params: PracticeChild,
        querystring: Type.Object({}, { additionalProperties: false }),
        body: AssignPractice,
        response: { 204: Type.Null() },
      },
    },
    async (request, reply) => {
      await available().assign(credentials(request, reply), request.params.childId, request.body);
      return reply.code(204).send();
    },
  );
}
