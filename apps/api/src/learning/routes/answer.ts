import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  answerBodyLimit,
  AnswerCommand,
  AnswerRound,
  AttemptReceipt,
  HintReceipt,
  ProblemParams,
} from '@education/contracts';
import { RequestError } from '../../shared/request-error.js';
import { sessionWriteGuard } from '../../shared/session-guard.js';
import type { AnswerService } from '../services/answer.js';
import { problemRequest } from './problem-request.js';

const path = '/api/v1/problems/:id/:version/answer';
const schema = {
  params: ProblemParams,
  querystring: Type.Object({}, { additionalProperties: false }),
};

export function registerAnswering(app: FastifyInstance, origin: string, answering?: AnswerService) {
  function handle(request: FastifyRequest<{ Params: ProblemParams }>, command?: AnswerCommand) {
    if (!answering) throw new RequestError(503, '暂时无法提交，请稍后重试。');
    const { credentials, problem } = problemRequest(request);
    return answering(credentials, problem, command);
  }
  app.get<{ Params: ProblemParams }>(
    path,
    { schema: { ...schema, response: { 200: AnswerRound } } },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('Vary', 'Cookie');
      return handle(request);
    },
  );
  app.post<{ Params: ProblemParams; Body: AnswerCommand }>(
    path,
    {
      bodyLimit: answerBodyLimit,
      onRequest: sessionWriteGuard(origin),
      schema: {
        ...schema,
        body: AnswerCommand,
        response: { 200: Type.Union([AttemptReceipt, HintReceipt]) },
      },
    },
    (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      return handle(request, request.body);
    },
  );
}
