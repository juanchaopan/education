import type { CueResult } from './narration';

// A lesson film runs from its title card, `opening`, through the problem's own
// scenes in teaching order.
export type FilmScene<Shot extends string> = Shot | 'opening';

// One narrated line: the caption shown while it plays and its recording.
export type FilmLine = Readonly<{ text: string; clip: string }>;

// What one of the child's moves changes: the next state, the lines the teacher
// says, the tones that mark it, and the scene that follows once the lines end.
export type Reaction<State, Shot extends string, Line extends string> = Readonly<{
  state: State;
  say: readonly Line[];
  chime: readonly number[];
  then?: Shot;
}>;

// Everything a film needs from its problem: the recorded lines, the title card
// state, the scene the film starts at, how each scene first appears, and how
// the scene on screen answers a move. A move a scene does not take is ignored.
export type FilmStory<
  State extends Readonly<{ shot: FilmScene<Shot> }>,
  Shot extends string,
  Line extends string,
  Move,
> = Readonly<{
  lines: Readonly<Record<Line, FilmLine>>;
  opening: State;
  first: Shot;
  arrive: (shot: Shot) => Reaction<State, Shot, Line>;
  respond: (state: State, move: Move) => Reaction<State, Shot, Line> | undefined;
}>;

type Voice = {
  interrupt: (step: string, source?: string, onCue?: () => void) => Promise<CueResult>;
};

export type Telling = {
  voice: Voice;
  step: string;
  show: (caption: string) => void;
  // Whether this run of lines is still the one on screen.
  current: () => boolean;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// A clip that has not started playing by then, such as a stalled download,
// stops holding the scene. A clip that is playing, or paused while the child
// asks a question, is always waited for to its real end.
const longestStall = 11_000;
const betweenLines = 310;
// How long a caption stays when its sound cannot play, so it can still be read.
const readingTime = (text: string) => Math.max(1_500, text.length * 220);

async function sayLine({ voice, step, show }: Telling, { text, clip }: FilmLine) {
  show(text);
  let started = false;
  const cue = voice.interrupt(step, clip, () => {
    started = true;
  });
  const stalled = wait(longestStall).then(() => (started ? cue : ('stalled' as const)));
  const heard = await Promise.race([cue, stalled]);
  if (heard === 'unavailable') await wait(readingTime(text));
  return heard;
}

// Says a scene's lines in order, each cutting in on whatever was still being
// said, and tells whether they were all heard. A newer run of lines, or the
// child cancelling a cue, ends this one where it is.
export async function tell(telling: Telling, said: readonly FilmLine[]) {
  for (const [index, line] of said.entries()) {
    if (index > 0) await wait(betweenLines);
    if (!telling.current()) return false;
    const heard = await sayLine(telling, line);
    if (heard === 'cancelled' || !telling.current()) return false;
  }
  return true;
}
