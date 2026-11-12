import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  answerBodyLimit,
  HintReceipt,
  ProblemParams,
  QuestionReceipt,
  VariationCommand,
  VariationReceipt,
  VariationState,
} from '@education/contracts';
import { problemRequest } from '../../shared/problem-request.js';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { VariationService } from '../services/variation.js';

const path = '/api/v1/problems/:id/:version/variation';
const schema = {
  params: ProblemParams,
  querystring: Type.Object({}, { additionalProperties: false }),
};

export function registerVariation(
  app: FastifyInstance,
  origin: string,
  variation?: VariationService,
) {
  function handle(request: FastifyRequest<{ Params: ProblemParams }>, command?: VariationCommand) {
    if (!variation) throw new RequestError(503, '暂时无法提交，请稍后重试。');
    const { credentials, problem } = problemRequest(request);
    return variation(credentials, problem, command);
  }
  app.get<{ Params: ProblemParams }>(
    path,
    { schema: { ...schema, response: { 200: VariationState } } },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return handle(request);
    },
  );
  app.post<{ Params: ProblemParams; Body: VariationCommand }>(
    path,
    {
      bodyLimit: answerBodyLimit,
      onRequest: sessionWriteGuard(origin),
      schema: {
        ...schema,
        body: VariationCommand,
        response: { 200: Type.Union([VariationReceipt, HintReceipt, QuestionReceipt]) },
      },
    },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      return handle(request, request.body);
    },
  );
}
