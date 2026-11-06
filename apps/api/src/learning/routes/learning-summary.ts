import type { FastifyInstance } from 'fastify';
import { LearningSummary, LearningSummaryParams, LearningSummaryQuery } from '@education/contracts';
import { readSessionCookie } from '../../shared/session-cookie.js';
import { RequestError } from '../../shared/request-error.js';
import type { LearningSummaryService } from '../services/learning-summary.js';

export function registerLearningSummary(app: FastifyInstance, service?: LearningSummaryService) {
  app.get<{ Params: LearningSummaryParams; Querystring: LearningSummaryQuery }>(
    '/api/v1/parents/children/:childId/learning-summary',
    {
      schema: {
        params: LearningSummaryParams,
        querystring: LearningSummaryQuery,
        response: { 200: LearningSummary },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      if (!service) throw new RequestError(503, '暂时无法查看学习摘要，请稍后重试。');
      return service(
        readSessionCookie(request),
        request.params.childId,
        Number(request.query.offset ?? 0),
      );
    },
  );
}
