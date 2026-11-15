import {
  AnswerCommand,
  AnswerRound,
  AttemptReceipt,
  HintReceipt,
  QuestionReceipt,
  type SubmitAnswer,
} from '@education/contracts';
import { requestLearning, type LearningScope } from './learning-request';
import { confirmedAttempt, encodeCommand, readReply } from './round-request';

const encode = (command: AnswerCommand) => encodeCommand(AnswerCommand, command);

export function readAnswerRound(scope: LearningScope, cancel?: AbortSignal) {
  return readReply(requestLearning(scope, 'answer', undefined, cancel), AnswerRound);
}

export function requestHint(
  scope: LearningScope,
  round: string,
  hintId: string,
  cancel?: AbortSignal,
) {
  return readReply(
    requestLearning(scope, 'answer', encode({ action: 'hint', round, hintId }), cancel),
    HintReceipt,
  );
}

// Records that the child asks the teacher while answering this round, which
// makes a later correct answer a helped one.
export function recordQuestion(scope: LearningScope, round: string) {
  return readReply(
    requestLearning(scope, 'answer', encode({ action: 'question', round })),
    QuestionReceipt,
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
    submit: confirmedAttempt(attemptId, (cancel) =>
      readReply(requestLearning(boundScope, 'answer', body, cancel), AttemptReceipt),
    ),
  };
}
