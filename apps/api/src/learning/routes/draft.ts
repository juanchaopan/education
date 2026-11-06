import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import { draftBodyLimit, DraftCommand, DraftResponse, ProblemParams } from '@education/contracts';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { DraftService } from '../services/draft.js';
import { problemRequest } from './problem-request.js';

const path = '/api/v1/problems/:id/:version/draft';
const schema = {
  params: ProblemParams,
  querystring: Type.Object({}, { additionalProperties: false }),
  response: { 200: DraftResponse, 409: DraftResponse },
};

function draftRequest(
  request: FastifyRequest<{ Params: ProblemParams }>,
  drafts?: DraftService,
  command?: DraftCommand,
) {
  if (!drafts) throw new RequestError(503, '草稿暂时不可用，请稍后重试。');
  const { credentials, problem } = problemRequest(request);
  return drafts(credentials, problem, command);
}

export function registerDrafts(app: FastifyInstance, origin: string, drafts?: DraftService) {
  app.get<{ Params: ProblemParams }>(path, { schema }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
    const { draft } = await draftRequest(request, drafts);
    return { draft };
  });
  app.post<{ Params: ProblemParams; Body: DraftCommand }>(
    path,
    {
      bodyLimit: draftBodyLimit,
      onRequest: sessionWriteGuard(origin),
      schema: { ...schema, body: DraftCommand },
    },
    async (request, reply) => {
      const { status, draft } = await draftRequest(request, drafts, request.body);
      return reply.code(status).send({ draft });
    },
  );
}
