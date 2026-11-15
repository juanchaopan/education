// The steps of a capsule while the child's words are on their way, which
// every capsule the child answers in shows alike: the microphone listening,
// the words being heard, what was sent being judged, and a send that failed.
export type UnderwayStep =
  | { kind: 'listening' | 'hearing'; message: string }
  | { kind: 'judging' }
  | { kind: 'failed'; message: string };

const underwayKinds: readonly string[] = ['listening', 'hearing', 'judging', 'failed'];

export const underway = <Step extends { kind: string }>(
  step: Step,
): step is Extract<Step, UnderwayStep> => underwayKinds.includes(step.kind);
