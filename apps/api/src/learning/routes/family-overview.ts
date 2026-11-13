import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  ChildParams,
  FamilyOverview,
  LearningRange,
  LearningRangeQuery,
  StudyDays,
  StudyDaysQuery,
} from '@education/contracts';
import { readSessionCookie } from '../../shared/session-cookie.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyOverviewService } from '../services/family-overview.js';

// A family's learning as the parent space reads it: the overview of every
// child, a child's earlier days, and a child's learning over a few days.
export function registerFamilyOverview(app: FastifyInstance, service?: FamilyOverviewService) {
  const available = (reply: FastifyReply) => {
    reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
    if (!service) throw new RequestError(503, '暂时无法查看学习记录，请稍后重试。');
    return service;
  };
  app.get(
    '/api/v1/parents/overview',
    { schema: { response: { 200: FamilyOverview } } },
    async (request, reply) => available(reply).overview(readSessionCookie(request)),
  );
  app.get<{ Params: ChildParams; Querystring: StudyDaysQuery }>(
    '/api/v1/parents/children/:childId/days',
    { schema: { params: ChildParams, querystring: StudyDaysQuery, response: { 200: StudyDays } } },
    async (request, reply) =>
      available(reply).days(readSessionCookie(request), request.params.childId, request.query.to),
  );
  app.get<{ Params: ChildParams; Querystring: LearningRangeQuery }>(
    '/api/v1/parents/children/:childId/learning',
    {
      schema: {
        params: ChildParams,
        querystring: LearningRangeQuery,
        response: { 200: LearningRange },
      },
    },
    async (request, reply) =>
      available(reply).range(
        readSessionCookie(request),
        request.params.childId,
        request.query.from,
        request.query.to,
      ),
  );
}
