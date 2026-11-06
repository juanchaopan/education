import type { HelpEvent, TeachingStep } from '@education/contracts';

type HintKind = Extract<HelpEvent['kind'], 'hint' | 'example' | 'demonstration'>;
type Hint = { kind: HintKind; instruction: string };

export function recordHelp(
  events: readonly HelpEvent[],
  stepId: string,
  kind: HelpEvent['kind'],
): HelpEvent[] {
  return [...events, { stepId, kind }];
}

export function helpOptions(step: TeachingStep, events: readonly HelpEvent[]) {
  const ladder: Hint[] = [{ kind: 'hint', instruction: step.hint }];
  if (step.example) ladder.push({ kind: 'example', instruction: step.example });
  ladder.push({ kind: 'demonstration', instruction: step.demonstration });
  const seen = new Set(
    events.filter((event) => event.stepId === step.id).map((event) => event.kind),
  );
  return {
    shown: ladder.findLast(({ kind }) => seen.has(kind)),
    next: ladder.find(({ kind }) => !seen.has(kind)),
  };
}
