import { useMutation } from '@tanstack/react-query';
import type { Round } from './round-query';
import { AnswerConflictError } from './round-request';

// One submission on its way to the server. `sent` tells one that had a
// round, which a retry repeats as it is, from one that never had a round or
// could not be sent as it was.
type Attempt<Input, Receipt> = { input: Input; sent: boolean; submit: () => Promise<Receipt> };

// The round a part of the problem is answered in, as its query holds it.
type RoundRead = Readonly<{ data?: Round; refetch: () => Promise<unknown> }>;

const offline = '暂时连不上，请重试。';

// An attempt that fails as it is sent, showing why.
const failing = <Input, Receipt>(input: Input, fail: () => never): Attempt<Input, Receipt> => ({
  input,
  sent: false,
  submit: async () => fail(),
});

// Submissions about one round of the problem, each sent once per attempt,
// so retrying after a lost reply never counts twice. One given before the
// round is known is not lost: it fails visibly and is sent again once the
// round arrives. One the shared schema refuses, such as words too long to
// send, fails visibly too. A round that changed elsewhere is read afresh
// instead of repeating a refused attempt. `prepare` makes the attempt that
// sends an input under a round.
export function useRoundAttempt<Input, Receipt>(
  round: RoundRead,
  prepare: (round: string, input: Input) => () => Promise<Receipt>,
  onJudged?: (receipt: Receipt) => void,
) {
  const submission = useMutation({
    mutationFn: (attempt: Attempt<Input, Receipt>) => attempt.submit(),
    onSuccess: onJudged,
  });

  function attemptFor(input: Input): Attempt<Input, Receipt> {
    const id = round.data?.round;
    if (!id)
      return failing(input, () => {
        void round.refetch();
        throw new Error(offline);
      });
    try {
      return { input, sent: true, submit: prepare(id, input) };
    } catch (error) {
      return failing(input, () => {
        throw error;
      });
    }
  }

  return {
    submission,
    submit(input: Input) {
      if (!submission.isPending) submission.mutate(attemptFor(input));
    },
    retry() {
      const last = submission.variables;
      if (!last || submission.isPending) return;
      if (submission.error instanceof AnswerConflictError) {
        submission.reset();
        void round.refetch();
      } else submission.mutate(last.sent ? last : attemptFor(last.input));
    },
  };
}
