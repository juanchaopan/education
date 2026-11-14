import type { Nudge } from './stage-activation';

// A value the child pushes forward through one scene of a derivation, such
// as the seconds two cars have driven: from where the scene began to the
// scene's stop, a key moment to look at. However fast the child pushes, the
// value halts at the stop, and it goes back no further than where the scene
// began; the scene ends once the stop is reached and its lines are heard.
export type PushRun = Readonly<{ from: number; stop: number }>;

// Values are kept to tenths, so a value pushed by hand lands exactly on a
// whole step when it reaches one.
const tenths = (value: number) => Math.round(value * 10) / 10;

// A value pushed by hand to `value`, kept within the run.
export function pushedTo({ from, stop }: PushRun, value: number) {
  return tenths(Math.min(stop, Math.max(from, value)));
}

// A value nudged one whole step on from where it stands, or back, as a tap
// or an arrow key does, kept within the run.
export function nudgedFrom(run: PushRun, value: number, nudge: Nudge) {
  const next = nudge > 0 ? Math.floor(value + 1) : Math.ceil(value - 1);
  return pushedTo(run, next);
}

// Whether the value stands at the run's stop.
export function atStop({ stop }: PushRun, value: number) {
  return value >= stop;
}
