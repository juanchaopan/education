import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ProblemParams } from '@education/contracts';
import { problemRequest } from '../../shared/problem-request.js';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { readSessionCredentials } from '../../shared/session-cookie.js';

type Credentials = ReturnType<typeof readSessionCredentials>;

// Records that the signed-in child has opened a problem of a book given to
// them, so the book stops being new; throws why the child may not open it.
export type MarkBookOpened = (
  credentials: Credentials,
  problem: { id: string; version: number },
) => Promise<void>;

// The page of a problem a child practises says it was opened, as a write of
// its own: opening the problem only reads, and reading never writes.
export function registerBookOpened(app: FastifyInstance, origin: string, mark?: MarkBookOpened) {
  const empty = Type.Object({}, { additionalProperties: false });
  app.post<{ Params: ProblemParams }>(
    '/api/v1/problems/:id/:version/opened',
    {
      bodyLimit: 1024,
      onRequest: sessionWriteGuard(origin),
      schema: {
        params: ProblemParams,
        querystring: empty,
        body: empty,
        response: { 204: Type.Null() },
      },
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      if (!mark) throw new RequestError(503, '暂时无法记下，请稍后重试。');
      const { credentials, problem } = problemRequest(request);
      await mark(credentials, problem);
      return reply.code(204).send();
    },
  );
}
