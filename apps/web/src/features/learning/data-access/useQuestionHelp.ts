import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { LearningScope } from './learning-request';
import { roundOptions, type RoundSource } from './round-query';

// What a question asked in a scene counts as help on: where the round it is
// recorded under is read, shared with the part of the problem being
// answered, and how one question is recorded on that round.
export type QuestionHelp = Readonly<{
  round: RoundSource;
  record: (scope: LearningScope, round: string) => Promise<unknown>;
}>;

const noRound: RoundSource = {
  name: 'question-help-none',
  read: () => Promise.resolve({ round: null }),
};

// A question asked of the teacher while the child is answering is help, like
// a hint: it is recorded on the round before the question goes out, once per
// round and per part of the problem, so a right answer after it never counts
// as done alone. The final answer and the variation that follows it share a
// round, so each part records its own help. `help` says what the question
// counts as help on in the scene asked about, if anything, and so whether a
// round is needed at all. `failed` tells that the question in hand could not
// be recorded yet.
export function useQuestionHelp(scope: LearningScope, help?: QuestionHelp) {
  const round = useQuery(roundOptions(help?.round ?? noRound, scope, help !== undefined));
  const record = useMutation({
    mutationFn: ({ id, on }: { id: string; on: QuestionHelp }) => on.record(scope, id),
  });
  const [failed, setFailed] = useState(false);

  async function recorded(on: QuestionHelp) {
    const id = round.data?.round ?? (await round.refetch()).data?.round;
    if (!id) return false;
    if (record.isSuccess && record.variables.id === id && record.variables.on === on) return true;
    try {
      await record.mutateAsync({ id, on });
      return true;
    } catch {
      return false;
    }
  }

  return {
    recording: record.isPending || round.isFetching,
    failed,
    // Returns whether the question may go out: it counts as help on nothing,
    // or it is recorded.
    async counted() {
      if (!help) return true;
      const done = await recorded(help);
      setFailed(!done);
      return done;
    },
    // A new question has not failed yet.
    reset: () => setFailed(false),
  };
}
