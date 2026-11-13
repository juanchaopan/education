// How often a child answered a problem wrongly and how often they finished it
// alone.
export type ReviewEvidence = { incorrect: number; independent: number };

// Worth another try: the problem, every version the child tried taken
// together, was answered wrongly more than once and never finished alone. A
// problem finished alone on any version is done, so a new version of a
// problem never puts it back on the list. An answer that could not be judged
// is not evidence of a wrong one.
export function reviewSuggested({ incorrect, independent }: ReviewEvidence) {
  return incorrect >= 2 && independent === 0;
}

// Each problem's counts over all the versions the child tried, in the order
// the problems first appear.
export function problemTotals(
  versions: readonly (ReviewEvidence & { id: string })[],
): Map<string, ReviewEvidence> {
  const totals = new Map<string, ReviewEvidence>();
  for (const { id, incorrect, independent } of versions) {
    const total = totals.get(id) ?? { incorrect: 0, independent: 0 };
    totals.set(id, {
      incorrect: total.incorrect + incorrect,
      independent: total.independent + independent,
    });
  }
  return totals;
}
