import type { CueResult } from './narration';

// A lesson film runs from its title card, `opening`, through the problem's own
// scenes in teaching order.
export type FilmScene<Shot extends string> = Shot | 'opening';

// A film's state always tells the scene on screen, the title card included.
export type FilmState<Shot extends string> = Readonly<{ shot: FilmScene<Shot> }>;

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
  State extends FilmState<Shot>,
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
  interrupt: (step: string, source: string) => Promise<CueResult>;
};

export type Telling = {
  voice: Voice;
  step: string;
  show: (caption: string) => void;
  // Whether this run of lines is still the one on screen.
  current: () => boolean;
};

const betweenLines = 310;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Says a scene's lines in order, each cutting in on whatever was still being
// said, and tells whether they were all heard. Every line is waited for until
// it is heard to its end, however long a line that did not come out waits for
// the child to hear it again. A newer run of lines, or a cancelled line, ends
// this one where it is.
export async function tell({ voice, step, show, current }: Telling, said: readonly FilmLine[]) {
  for (const [index, { text, clip }] of said.entries()) {
    if (index > 0) await wait(betweenLines);
    if (!current()) return false;
    show(text);
    const heard = await voice.interrupt(step, clip);
    if (heard === 'cancelled' || !current()) return false;
  }
  return true;
}
