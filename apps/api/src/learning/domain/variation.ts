import type {
  ProblemVariations,
  VariationAttempt,
  VariationPart,
  VariationPartStatus,
} from '@education/contracts';
import type { JudgedOutcome } from './outcome.js';

// What is recorded of one variation round: its guess, its first and last
// judged reason (each null until there is one), the help taken during it,
// and the first and last time anything was recorded.
export type VariationRound = Readonly<{
  id: string;
  version: number;
  guess: JudgedOutcome | null;
  firstReason: JudgedOutcome | null;
  lastReason: JudgedOutcome | null;
  help: number;
  startedAt: Date;
  updatedAt: Date;
}>;

const parts: readonly VariationPart[] = ['guess', 'reason'];

const isClear = (outcome: JudgedOutcome | null): outcome is 'independent' | 'assisted' =>
  outcome === 'independent' || outcome === 'assisted';

// One round as a parent reads it. The reason's final result is the last judged
// one when it was clear; a round whose reason was never said clearly, because
// the child left or never got there, ends 没说清.
export function variationAttempt(round: VariationRound): VariationAttempt {
  return {
    guess: round.guess,
    reason: {
      first: round.firstReason && (isClear(round.firstReason) ? 'clear' : 'unclear'),
      final: isClear(round.lastReason) ? round.lastReason : 'unclear',
    },
    help: round.help,
    startedAt: round.startedAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
  };
}

// The best a part has been done in any round: without help, after help, or
// not yet right.
function best(results: readonly (string | null)[]): VariationPartStatus {
  if (results.includes('independent')) return 'independent';
  return results.includes('assisted') ? 'assisted' : 'not-yet';
}

// What one problem's variation rounds show: for the guess and for the reason,
// the best any round reached, and the parts the child has not yet done
// without help. A part done once without help counts as shown even when a
// later round went worse; every round stays listed with it, oldest first.
function summarize(
  problem: Pick<ProblemVariations, 'id' | 'version'>,
  rounds: readonly VariationRound[],
): Omit<ProblemVariations, 'title'> {
  const attempts = [...rounds]
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .map(variationAttempt);
  const status = {
    guess: best(attempts.map(({ guess }) => guess)),
    reason: best(attempts.map(({ reason }) => reason.final)),
  };
  return {
    ...problem,
    status,
    missing: parts.filter((part) => status[part] !== 'independent'),
    attempts,
  };
}

// A child's variation rounds grouped by problem version, in the order the
// problems first appear.
export function problemVariations(rounds: readonly VariationRound[]) {
  const byProblem = new Map<string, { id: string; version: number; rounds: VariationRound[] }>();
  for (const round of rounds) {
    const key = JSON.stringify([round.id, round.version]);
    const problem = byProblem.get(key) ?? { id: round.id, version: round.version, rounds: [] };
    problem.rounds.push(round);
    byProblem.set(key, problem);
  }
  return [...byProblem.values()].map(({ rounds: own, ...problem }) => summarize(problem, own));
}
