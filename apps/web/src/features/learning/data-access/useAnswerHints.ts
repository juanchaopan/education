import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

// Asks the server for one authored hint by its id.
export type HintAsk = (hintId: string) => Promise<{ hint: string }>;

// What the rest of the page hears of the answer as it happens: an authored
// hint the child received, by its id, and a count judged right.
export type AnswerEvents = Readonly<{
  onHint?: (hintId: string) => void;
  onCorrect?: () => void;
}>;

// The problem's authored hints, received one at a time in their order. `ask`
// is missing while hints cannot be asked for yet.
export function useAnswerHints(
  hintIds: readonly string[],
  ask: HintAsk | undefined,
  events: AnswerEvents,
) {
  const [hints, setHints] = useState<readonly string[]>([]);
  const hint = useMutation({
    mutationFn: ({ hintId, from }: { hintId: string; from: HintAsk }) => from(hintId),
    onSuccess: ({ hint: text }, { hintId }) => {
      setHints((shown) => [...shown, text]);
      events.onHint?.(hintId);
    },
  });
  const next = hintIds[hints.length];
  return {
    hint: hints.at(-1),
    // A hint is on its way, or the last request for one failed.
    hintWaiting: hint.isPending,
    hintFailed: hint.isError,
    // How many of the authored hints the child has still to receive.
    hintsLeft: hintIds.length - hints.length,
    canHint: ask !== undefined && !hint.isPending && next !== undefined,
    askHint() {
      if (next && ask && !hint.isPending) hint.mutate({ hintId: next, from: ask });
    },
  };
}
