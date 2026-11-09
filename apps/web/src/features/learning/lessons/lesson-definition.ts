import type { ComponentType, ReactNode } from 'react';
import type {
  Backdrop,
  Camera,
  StageLook,
  StagePalette,
  Teacher,
} from '../components/lesson-stage/stage-look';
import type { FilmLine, FilmState, FilmStory, Reaction } from '../interaction/lesson-film';
import type { CountWords } from '../interaction/spoken-answer';
import type { Handling } from '../interaction/stage-activation';
import type { StageProps } from '../interaction/useStageDrag';

// The lines, the scenes in teaching order and what is said on arriving at
// each, and how the backdrop is framed in the scenes that move closer.
export type Script<Shot extends string, Line extends string> = Readonly<{
  lines: Readonly<Record<Line, FilmLine>>;
  shots: readonly [Shot, ...Shot[]];
  entryLines: Readonly<Record<Shot, readonly Line[]>>;
  cameras?: Readonly<Partial<Record<Shot, Camera>>>;
}>;

// The scenes' rules: the title card's state, a scene as it first appears,
// which is also where a saved lesson resumes, how the scene on screen answers
// a move, and which scenes are work worth saving.
export type Story<State, Shot extends string, Line extends string, Move> = Readonly<{
  opening: State;
  arrive: (shot: Shot) => Reaction<State, Shot, Line>;
  respond: (state: State, move: Move) => Reaction<State, Shot, Line> | undefined;
  savesProgress: (shot: Shot) => boolean;
}>;

// The props the child picks up and puts down, and how one looks while carried.
export type LessonProps<Move, Piece extends string, Look extends object> = StageProps<
  Move,
  Readonly<Record<Piece, Look>>
> &
  Readonly<{ carried: (look: Look) => ReactNode }>;

// The final count: the scene it is asked in, the question, the unit it is said
// in and what a wrong count most likely is, the numbers to tap, and the ids of
// the plugin's hints in the order the child receives them.
export type LessonAnswer<Shot extends string> = Readonly<{
  shot: Shot;
  question: string;
  words: CountWords;
  choices: readonly number[];
  hints: readonly string[];
}>;

export type SceneProps<State> = { state: State; handling: Handling };

// How a lesson's film looks: its title and series, for example 菜园小剧场, the
// names a screen reader gives the film and the props inside it, its backdrop,
// teacher and palette, and the lesson's paints and symbols and what drifts
// over its scenes.
type Looks = Readonly<{
  title: string;
  theater: string;
  labels: Readonly<{ film: string; world: string }>;
  backdrop: Backdrop;
  teacher: Teacher;
  palette: StagePalette;
  defs?: ReactNode;
  ambience?: ReactNode;
}>;

// Everything one problem gives the shared lesson page: its version, how its
// film looks, its script and scene rules, its props, its final count and its
// own scene, drawn on the stage's 1200×675 world. The page is built for one
// definition at a time, so each lesson's own types hold all the way through.
export type LessonDefinition<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
  Piece extends string,
  Look extends object,
> = Looks &
  Readonly<{
    problem: Readonly<{ id: string; version: number }>;
    script: Script<Shot, Line>;
    story: Story<State, Shot, Line, Move>;
    props: LessonProps<Move, Piece, Look>;
    answer: LessonAnswer<Shot>;
    Scene: ComponentType<SceneProps<State>>;
  }>;

// The lesson's film, which starts at its first scene.
export function filmStory<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
>(
  script: Script<Shot, Line>,
  story: Story<State, Shot, Line, Move>,
): FilmStory<State, Shot, Line, Move> {
  return {
    lines: script.lines,
    opening: story.opening,
    first: script.shots[0],
    arrive: story.arrive,
    respond: story.respond,
  };
}

// The lesson's film as the stage draws it, each scene in its own framing.
export function stageLook(
  lesson: Looks & Readonly<{ script: Pick<Script<string, string>, 'cameras'> }>,
): StageLook {
  const { title, theater, labels, backdrop, teacher, palette, script } = lesson;
  return {
    label: labels.film,
    worldLabel: labels.world,
    title,
    theater,
    backdrop,
    cameras: script.cameras,
    teacher,
    palette,
  };
}

// The scene's own instruction, its last entry line, which stands in when the
// teacher cannot answer a question about it.
export function guidance<Shot extends string, Line extends string>(
  script: Script<Shot, Line>,
  shot: Shot,
) {
  const last = script.entryLines[shot].at(-1);
  return last === undefined ? '' : script.lines[last].text;
}

// The scene that follows one of the lesson's scenes in teaching order, if any.
export function shotAfter<Shot extends string>(
  { shots }: Readonly<{ shots: readonly Shot[] }>,
  shot: Shot,
): Shot | undefined {
  const index = shots.indexOf(shot);
  return index < 0 ? undefined : shots[index + 1];
}

// The scene a saved step comes back to: one of the lesson's scenes, past its
// first, which a new start reaches anyway.
export function resumed<Shot extends string>(
  { shots }: Readonly<{ shots: readonly [Shot, ...Shot[]] }>,
  stepId: string,
): Shot | undefined {
  const index = shots.findIndex((shot) => shot === stepId);
  return index > 0 ? shots[index] : undefined;
}
