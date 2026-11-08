import type { FastifyInstance } from 'fastify';
import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { ProblemParams } from '@education/contracts';
import { problemRequest } from '../../shared/problem-request.js';
import { RequestError } from '../../shared/request-error.js';
import { noteRequest, type AiOutcome } from '../../shared/request-log.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';

type Problem = ReturnType<typeof problemRequest>['problem'];
type Credentials = ReturnType<typeof problemRequest>['credentials'];
type Handler<B, R> = (
  credentials: Credentials,
  problem: Problem,
  body: B,
  signal: AbortSignal,
) => Promise<R>;
type Result = Omit<AiOutcome, 'resource'>;

// A child's AI request for one problem step: same-origin JSON with the session
// and CSRF token, a bounded body, an uncached reply, and cancellation of the
// provider call when the child stops waiting or leaves. Only how the call ended
// goes to the request log, never the child's text or the provider's reply.
export function registerChildAiRequest<B extends TSchema, R extends TSchema>(
  app: FastifyInstance,
  origin: string,
  route: { resource: string; bodyLimit: number; body: B; reply: R },
  handle?: Handler<Static<B>, Static<R> & Result>,
) {
  app.post<{ Params: ProblemParams; Body: Static<B> }>(
    `/api/v1/problems/:id/:version/${route.resource}`,
    {
      bodyLimit: route.bodyLimit,
      onRequest: sessionWriteGuard(origin),
      schema: {
        params: ProblemParams,
        querystring: Type.Object({}, { additionalProperties: false }),
        body: route.body,
        response: { 200: route.reply },
      },
    },
    async (request, reply) => {
      if (!handle) throw new RequestError(503, '暂时无法提交，请稍后重试。');
      const { credentials, problem } = problemRequest(request);
      const cancel = new AbortController();
      reply.raw.once('close', () => {
        if (!reply.raw.writableFinished) cancel.abort();
      });
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      const result = await handle(credentials, problem, request.body, cancel.signal);
      const { status, reason, source } = result;
      noteRequest(request, { ai: { resource: route.resource, status, reason, source } });
      return result;
    },
  );
}
