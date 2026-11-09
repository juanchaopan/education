import type { ReactNode } from 'react';
import type {
  Backdrop,
  Camera,
  StageLook,
  StagePalette,
  Teacher,
} from '../components/lesson-stage/stage-look';
import type { FilmLine, FilmScene, FilmStory, Reaction } from '../interaction/lesson-film';
import type { CountWords } from '../interaction/spoken-answer';
import type { Handling } from '../interaction/stage-activation';
import type { StageProps } from '../interaction/useStageDrag';

// The lines, the scenes in teaching order and what is said on arriving at
// each, and how the backdrop is framed in the scenes that move closer.
type Script<Shot extends string, Line extends string> = Readonly<{
  lines: Readonly<Record<Line, FilmLine>>;
  shots: readonly [Shot, ...Shot[]];
  entryLines: Readonly<Record<Shot, readonly Line[]>>;
  cameras?: Readonly<Partial<Record<Shot, Camera>>>;
}>;

// The scenes' rules: the title card's state, a scene as it first appears,
// which is also where a saved lesson resumes, how the scene on screen answers
// a move, and which scenes are work worth saving.
type Story<State, Shot extends string, Line extends string, Move> = Readonly<{
  opening: State;
  arrive(shot: Shot): Reaction<State, Shot, Line>;
  respond(state: State, move: Move): Reaction<State, Shot, Line> | undefined;
  savesProgress(shot: Shot): boolean;
}>;

// The props the child picks up and puts down, and how one looks while carried.
type Props<Move, Piece extends string, Look extends object> = StageProps<
  Move,
  Readonly<Record<Piece, Look>>
> & { carried(look: Look): ReactNode };

// The final count: the scene it is asked in, the question, the unit it is said
// in and what a wrong count most likely is, the numbers to tap, and the ids of
// the plugin's hints in the order the child receives them.
type Answer<Shot extends string> = Readonly<{
  shot: Shot;
  question: string;
  words: CountWords;
  choices: readonly number[];
  hints: readonly string[];
}>;

export type SceneProps<State> = { state: State; handling: Handling };

// Everything one problem gives the shared lesson page: its version, how its
// film looks, its script and scene rules, its props, its final count and its
// own scene, drawn on the stage's 1200×675 world. Its functions are methods,
// so every lesson's definition is also a `Lesson`, which the shared page
// takes.
export type LessonDefinition<
  State extends Readonly<{ shot: FilmScene<Shot> }>,
  Shot extends string,
  Line extends string,
  Move,
  Piece extends string,
  Look extends object,
> = Readonly<{
  problem: Readonly<{ id: string; version: number }>;
  title: string;
  // The lesson's series, for example 菜园小剧场.
  theater: string;
  // The names a screen reader gives the film and the props inside it.
  labels: Readonly<{ film: string; world: string }>;
  backdrop: Backdrop;
  teacher: Teacher;
  palette: StagePalette;
  // The lesson's paints and symbols, and what drifts over its scenes.
  defs?: ReactNode;
  ambience?: ReactNode;
  script: Script<Shot, Line>;
  story: Story<State, Shot, Line, Move>;
  props: Props<Move, Piece, Look>;
  answer: Answer<Shot>;
  Scene(props: SceneProps<State>): ReactNode;
}>;

export type LessonState = Readonly<{ shot: string }>;

// Any lesson, as the shared page and the registry hold it.
export type Lesson = LessonDefinition<LessonState, string, string, unknown, string, object>;

// The lesson's film, which starts at its first scene.
export function filmStory({
  script,
  story,
}: Lesson): FilmStory<LessonState, string, string, unknown> {
  return {
    lines: script.lines,
    opening: story.opening,
    first: script.shots[0],
    arrive: story.arrive,
    respond: story.respond,
  };
}

// The lesson's film as the stage draws it.
export function stageLook(lesson: Lesson): StageLook {
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
export function guidance({ script }: Lesson, shot: string) {
  const last = script.entryLines[shot]?.at(-1);
  return last === undefined ? '' : script.lines[last].text;
}

// The scene that follows one of the lesson's scenes in teaching order, if any.
export function shotAfter({ script }: Lesson, shot: string): string | undefined {
  const index = script.shots.indexOf(shot);
  return index < 0 ? undefined : script.shots[index + 1];
}

// Whether a saved step is a scene to come back to: one of the lesson's
// scenes, past its first, which a new start reaches anyway.
export function resumes({ script }: Lesson, stepId: string) {
  return script.shots.includes(stepId) && stepId !== script.shots[0];
}
