import {
  HintReceipt,
  QuestionReceipt,
  VariationCommand,
  VariationReceipt,
  VariationState,
  type SubmitGuess,
  type SubmitReason,
} from '@education/contracts';
import { requestLearning, type LearningScope } from './learning-request';
import { confirmedAttempt, encodeCommand, readReply } from './round-request';

const encode = (command: VariationCommand) => encodeCommand(VariationCommand, command);

// The variation of the round the child last answered right, and whether its
// guess and a clear reason are recorded.
export function readVariationState(scope: LearningScope, cancel?: AbortSignal) {
  return readReply(requestLearning(scope, 'variation', undefined, cancel), VariationState);
}

export function requestVariationHint(scope: LearningScope, round: string, hintId: string) {
  return readReply(
    requestLearning(scope, 'variation', encode({ action: 'hint', round, hintId })),
    HintReceipt,
  );
}

// Records that the child asks the teacher during the variation, which makes
// a later right guess or clear reason a helped one.
export function recordVariationQuestion(scope: LearningScope, round: string) {
  return readReply(
    requestLearning(scope, 'variation', encode({ action: 'question', round })),
    QuestionReceipt,
  );
}

// The variation's guess or reason, sent under one attempt id however often a
// lost reply makes it be sent again.
export function prepareVariationAnswer(
  scope: LearningScope,
  answer: Omit<SubmitGuess, 'attemptId'> | Omit<SubmitReason, 'attemptId'>,
) {
  const attemptId = crypto.randomUUID();
  const body = encode({ ...answer, attemptId });
  const boundScope = { ...scope };
  return confirmedAttempt(attemptId, (cancel) =>
    readReply(requestLearning(boundScope, 'variation', body, cancel), VariationReceipt),
  );
}
