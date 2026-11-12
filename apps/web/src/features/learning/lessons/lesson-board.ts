import type { ReactNode } from 'react';
import type { BoardFact } from '../components/lesson-stage/ConclusionBoard';
import type { FilmState } from '../interaction/lesson-film';

// How many of one of the lesson's pictures, for example three apples.
export type Amount<Picture extends string> = readonly [count: number, picture: Picture];

// One conclusion a lesson keeps on its board once a scene has found it:
// - `says`, the sentence a screen reader reads for it;
// - `amounts`, the amounts that weigh the same, drawn in order with equal
//   signs between them;
// - `from`, the first scene it shows in; while that scene plays it shows
//   once `found` says the state has found it, or from the scene's start;
// - `uses` and `hints`, the scenes, and the answer's hints while the child
//   answers, that use it and so light it up;
// - `answer`, the final count it is written on with once the child has
//   answered right, and the sentence it then reads as;
// - `supposed`, a changed condition, set beside the one it changes by
//   coming right after it in the lesson's list.
export type Conclusion<State, Shot extends string, Picture extends string> = Readonly<{
  id: string;
  says: string;
  amounts: readonly [Amount<Picture>, ...Amount<Picture>[]];
  from: Shot;
  found?: (state: State) => boolean;
  uses?: readonly Shot[];
  hints?: readonly string[];
  answer?: Readonly<{ amount: Amount<Picture>; says: string }>;
  supposed?: boolean;
}>;

// A lesson's conclusion board: the small pictures its amounts are drawn
// with, each an SVG element the board scales to the size of the words, and
// its conclusions in the order they stand on the board.
export type LessonBoard<State, Shot extends string, Picture extends string> = Readonly<{
  pictures: Readonly<Record<Picture, ReactNode>>;
  conclusions: readonly Conclusion<State, Shot, Picture>[];
}>;

// How far the child has got with the final count: answered right in this
// visit, and the last of the authored hints received.
export type AnswerProgress = Readonly<{ answered: boolean; hint?: string }>;

// Where a lesson's scenes stand in teaching order, and which one asks for
// the count.
export type BoardScenes<Shot extends string> = Readonly<{ shots: readonly Shot[]; answer: Shot }>;

// What the board knows of the film when it draws a conclusion: the scene on
// screen, whether the count is answered, and the hint the child is using.
type Moment<Shot extends string> = Readonly<{ shot: Shot; answered: boolean; hint?: string }>;

function shown<State extends FilmState<Shot>, Shot extends string>(
  { from, found }: Conclusion<State, Shot, string>,
  { shots }: BoardScenes<Shot>,
  shot: Shot,
  state: State,
) {
  const now = shots.indexOf(shot);
  const first = shots.indexOf(from);
  return now > first || (now === first && (found?.(state) ?? true));
}

function used<Shot extends string>(
  { uses = [], hints = [] }: Conclusion<never, Shot, string>,
  { shot, hint }: Moment<Shot>,
) {
  return uses.includes(shot) || (hint !== undefined && hints.includes(hint));
}

// A conclusion as the board draws it. Its amounts only ever grow at the end,
// so each is named by its place in the line.
function factOf<Shot extends string>(
  conclusion: Conclusion<never, Shot, string>,
  pictures: Readonly<Record<string, ReactNode>>,
  moment: Moment<Shot>,
): BoardFact {
  const written = moment.answered ? conclusion.answer : undefined;
  const amounts = written ? [...conclusion.amounts, written.amount] : conclusion.amounts;
  return {
    id: conclusion.id,
    says: written?.says ?? conclusion.says,
    amounts: amounts.map(([count, picture], place) => ({
      key: `${place}-${picture}`,
      count,
      picture: pictures[picture],
    })),
    lit: used(conclusion, moment),
    supposed: conclusion.supposed ?? false,
  };
}

// The conclusions a lesson's board shows in a state of its film, as the board
// draws them; the title card shows none. The count is answered once the
// child got it right in this visit, or once the film has moved past the
// scene that asks for it. A hint lights what it uses only while the child is
// still answering.
export function boardFacts<State extends FilmState<Shot>, Shot extends string>(
  { pictures, conclusions }: LessonBoard<State, Shot, string>,
  scenes: BoardScenes<Shot>,
  state: State,
  progress: AnswerProgress,
): BoardFact[] {
  const shot = state.shot;
  if (shot === 'opening') return [];
  const { shots, answer } = scenes;
  const answered = progress.answered || shots.indexOf(answer) < shots.indexOf(shot);
  const moment = {
    shot,
    answered,
    hint: shot === answer && !answered ? progress.hint : undefined,
  };
  return conclusions
    .filter((conclusion) => shown(conclusion, scenes, shot, state))
    .map((conclusion) => factOf(conclusion, pictures, moment));
}
