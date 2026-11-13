import type { FastifyInstance } from 'fastify';
import { FamilyOverview } from '@education/contracts';
import { readSessionCookie } from '../../shared/session-cookie.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyOverviewService } from '../services/family-overview.js';

export function registerFamilyOverview(app: FastifyInstance, service?: FamilyOverviewService) {
  app.get(
    '/api/v1/parents/overview',
    { schema: { response: { 200: FamilyOverview } } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      if (!service) throw new RequestError(503, '暂时无法查看总览，请稍后重试。');
      return service(readSessionCookie(request));
    },
  );
}
