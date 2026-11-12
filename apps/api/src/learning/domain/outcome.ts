// What a problem's authored rule makes of one answer: right, wrong, or not
// understood, which is never counted as wrong.
export type Judgement = 'correct' | 'incorrect' | 'uncertain';

// How an answer is recorded: right without help, right after help, wrong, or
// not understood.
export type Outcome = 'independent' | 'assisted' | 'incorrect' | 'uncertain';

// A right answer counts as helped when help was taken before it in the same
// round; help never turns a wrong or unclear answer into anything else.
export function outcomeOf(judgement: Judgement, helped: boolean): Outcome {
  if (judgement === 'correct') return helped ? 'assisted' : 'independent';
  return judgement;
}
