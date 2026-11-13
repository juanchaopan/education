import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  answerBodyLimit,
  PreviewCommand,
  PreviewReceipt,
  ProblemParams,
} from '@education/contracts';
import { problemRequest } from '../../shared/problem-request.js';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { PreviewService } from '../services/preview.js';

// A parent's answer or hint request while previewing a problem. It is sent
// like any other write from the site, and its reply depends on the session.
export function registerPreview(app: FastifyInstance, origin: string, preview?: PreviewService) {
  app.post<{ Params: ProblemParams; Body: PreviewCommand }>(
    '/api/v1/problems/:id/:version/preview',
    {
      bodyLimit: answerBodyLimit,
      onRequest: sessionWriteGuard(origin),
      schema: {
        params: ProblemParams,
        querystring: Type.Object({}, { additionalProperties: false }),
        body: PreviewCommand,
        response: { 200: PreviewReceipt },
      },
    },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      if (!preview) throw new RequestError(503, '暂时无法提交，请稍后重试。');
      const { credentials, problem } = problemRequest(request);
      return preview(credentials, problem, request.body);
    },
  );
}
