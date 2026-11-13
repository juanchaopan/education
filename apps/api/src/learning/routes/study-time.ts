import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { readSessionCredentials } from '../../shared/session-cookie.js';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { StudyTimeService } from '../services/study-time.js';

const nothing = Type.Object({}, { additionalProperties: false });

// The heartbeat of a lesson page a signed-in child is working on.
export function registerStudyTime(
  app: FastifyInstance,
  origin: string,
  service?: StudyTimeService,
) {
  app.post(
    '/api/v1/children/study-time',
    {
      bodyLimit: 256,
      onRequest: sessionWriteGuard(origin),
      schema: { querystring: nothing, body: nothing },
    },
    async (request, reply) => {
      if (!service) throw new RequestError(503, '暂时无法记录学习时间。');
      await service(readSessionCredentials(request));
      return reply.code(204).send();
    },
  );
}
