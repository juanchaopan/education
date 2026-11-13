import type { FastifyInstance } from 'fastify';
import { ProblemOpening, ProblemParams } from '@education/contracts';
import { problemRequest } from '../../shared/problem-request.js';
import { RequestError } from '../../shared/request-error.js';
import type { readSessionCredentials } from '../../shared/session-cookie.js';

type Credentials = ReturnType<typeof readSessionCredentials>;

// Opens a problem version for the session the request carries, or throws
// why it does not open.
export type OpenProblem = (
  credentials: Credentials,
  problem: { id: string; version: number },
) => Promise<ProblemOpening>;

// A problem opens only for a signed-in viewer; without accounts nobody is
// signed in. The reply depends on the session, so no cache keeps it or hands
// it to another session.
export function registerCatalog(app: FastifyInstance, open?: OpenProblem) {
  app.get<{ Params: ProblemParams }>(
    '/api/v1/problems/:id/:version',
    { schema: { params: ProblemParams, response: { 200: ProblemOpening } } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      if (!open) throw new RequestError(401, '登录已失效，请重新登录。');
      const { credentials, problem } = problemRequest(request);
      return open(credentials, problem);
    },
  );
}
