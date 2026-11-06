import {
  answerBodyLimit,
  AnswerCommand,
  AnswerRound,
  AttemptReceipt,
  HintReceipt,
  type SubmitAnswer,
} from '@education/contracts';
import type { Static, TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { requestLearning, type LearningScope } from './learning-request';

export class AnswerConflictError extends Error {}

function encode(command: AnswerCommand) {
  const body = JSON.stringify(command);
  if (
    !Value.Check(AnswerCommand, command) ||
    new TextEncoder().encode(body).length > answerBodyLimit
  )
    throw new Error('这次作答格式有误或太长，请检查后重试。');
  return body;
}

async function read<S extends TSchema>(request: Promise<Response>, schema: S): Promise<Static<S>> {
  const response = await request;
  if (response.status === 409)
    throw new AnswerConflictError('这一轮的提交有变化，请重新打开题目。');
  if (!response.ok) throw new Error('暂时连不上，请重试。');
  const payload: unknown = await response.json();
  if (!Value.Check(schema, payload)) throw new Error('暂时无法确认提交结果，请重试。');
  return payload;
}

export function readAnswerRound(scope: LearningScope, cancel?: AbortSignal) {
  return read(requestLearning(scope, 'answer', undefined, cancel), AnswerRound);
}

export function requestHint(
  scope: LearningScope,
  round: string,
  hintId: string,
  cancel?: AbortSignal,
) {
  return read(
    requestLearning(scope, 'answer', encode({ action: 'hint', round, hintId }), cancel),
    HintReceipt,
  );
}

export function prepareAttempt(
  scope: LearningScope,
  answer: Omit<SubmitAnswer, 'action' | 'attemptId'>,
) {
  const attemptId = crypto.randomUUID();
  const body = encode({ ...answer, action: 'submit', attemptId });
  const boundScope = { ...scope };
  return {
    attemptId,
    submit: async (cancel?: AbortSignal) => {
      const receipt = await read(
        requestLearning(boundScope, 'answer', body, cancel),
        AttemptReceipt,
      );
      if (receipt.attemptId !== attemptId) throw new Error('暂时无法确认提交结果，请重试。');
      return receipt;
    },
  };
}
