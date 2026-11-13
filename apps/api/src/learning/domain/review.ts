// How often a child answered one problem version wrongly and how often they
// finished it alone.
export type ReviewEvidence = { incorrect: number; independent: number };

// Worth another try: answered wrongly more than once and never finished alone.
// An answer that could not be judged is not evidence of a wrong one.
export function reviewSuggested({ incorrect, independent }: ReviewEvidence) {
  return incorrect >= 2 && independent === 0;
}
