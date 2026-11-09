import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { recordQuestion } from './answer-request';
import type { LearningScope } from './learning-request';
import { answerRound } from './useLessonAnswer';

// A question asked of the teacher while answering is help, like a hint: it is
// recorded on the round before the question goes out, once per round, so a
// correct answer after it never counts as done alone. `active` says whether
// the child is answering, and so whether the round is needed at all.
// `failed` tells that the question in hand could not be recorded yet.
export function useQuestionHelp(scope: LearningScope, active: boolean) {
  const round = useQuery(answerRound(scope, active));
  const record = useMutation({ mutationFn: (id: string) => recordQuestion(scope, id) });
  const [failed, setFailed] = useState(false);

  async function recorded() {
    const id = round.data?.round ?? (await round.refetch()).data?.round;
    if (!id) return false;
    if (record.isSuccess && record.variables === id) return true;
    try {
      await record.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }

  return {
    recording: record.isPending || round.isFetching,
    failed,
    // Returns whether the question may go out.
    async counted() {
      const done = await recorded();
      setFailed(!done);
      return done;
    },
    // A new question has not failed yet.
    reset: () => setFailed(false),
  };
}
