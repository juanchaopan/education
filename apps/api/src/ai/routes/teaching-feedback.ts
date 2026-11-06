import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  feedbackBodyLimit,
  FeedbackRequest,
  ProblemParams,
  TeachingFeedbackResult,
} from '@education/contracts';
import { problemRequest } from '../../shared/problem-request.js';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { TeachingFeedbackService } from '../services/teaching-feedback.js';

const path = '/api/v1/problems/:id/:version/feedback';

export function registerTeachingFeedback(
  app: FastifyInstance,
  origin: string,
  feedback?: TeachingFeedbackService,
) {
  app.post<{ Params: ProblemParams; Body: FeedbackRequest }>(
    path,
    {
      bodyLimit: feedbackBodyLimit,
      onRequest: sessionWriteGuard(origin),
      schema: {
        params: ProblemParams,
        querystring: Type.Object({}, { additionalProperties: false }),
        body: FeedbackRequest,
        response: { 200: TeachingFeedbackResult },
      },
    },
    (request, reply) => {
      if (!feedback) throw new RequestError(503, '暂时无法提交，请稍后重试。');
      const { credentials, problem } = problemRequest(request);
      // A child who stops waiting or leaves releases the pending model call.
      const cancel = new AbortController();
      reply.raw.once('close', () => {
        if (!reply.raw.writableFinished) cancel.abort();
      });
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return feedback(credentials, problem, request.body, cancel.signal);
    },
  );
}
