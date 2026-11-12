// What a problem's authored rule makes of one answer: right, wrong, or not
// understood, which is never counted as wrong.
export type Judgement = 'correct' | 'incorrect' | 'uncertain';

// How an answer is recorded: right without help, right after help, wrong, or
// not understood.
export type Outcome = 'independent' | 'assisted' | 'incorrect' | 'uncertain';

// The outcome of an answer the rule could judge.
export type JudgedOutcome = Exclude<Outcome, 'uncertain'>;

// A right answer counts as helped when help was taken before it in the same
// round; help never turns a wrong answer into anything else.
export function judgedOutcome(
  judgement: Exclude<Judgement, 'uncertain'>,
  helped: boolean,
): JudgedOutcome {
  if (judgement === 'correct') return helped ? 'assisted' : 'independent';
  return 'incorrect';
}

// Any answer's outcome: an answer the rule could not judge stays uncertain.
export function outcomeOf(judgement: Judgement, helped: boolean): Outcome {
  return judgement === 'uncertain' ? 'uncertain' : judgedOutcome(judgement, helped);
}
