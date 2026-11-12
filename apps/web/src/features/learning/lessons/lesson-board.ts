import type { Conclusion } from '@education/problems/lesson-content';
import type { ReactNode } from 'react';
import type { BoardFact } from '../components/lesson-stage/ConclusionBoard';
import type { FilmState } from '../interaction/lesson-film';

// How a lesson whose way of teaching keeps its conclusions on the board draws
// them: the small pictures its amounts are drawn with, each an SVG element
// the board scales to the size of the words, and, by conclusion id, when a
// conclusion counts as found in the scene that first shows it, for example
// once the scale is level. A conclusion with no such rule shows from its
// scene's start. The conclusions themselves are the lesson's content.
export type LessonBoard<State, Picture extends string> = Readonly<{
  pictures: Readonly<Record<Picture, ReactNode>>;
  found?: Readonly<Record<string, (state: State) => boolean>>;
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

function shown<State, Shot extends string>(
  { id, from }: Conclusion<Shot, string>,
  { found }: LessonBoard<State, string>,
  { shots }: BoardScenes<Shot>,
  shot: Shot,
  state: State,
) {
  const now = shots.indexOf(shot);
  const first = shots.indexOf(from);
  return now > first || (now === first && (found?.[id]?.(state) ?? true));
}

function used<Shot extends string>(
  { uses = [], hints = [] }: Conclusion<Shot, string>,
  { shot, hint }: Moment<Shot>,
) {
  return uses.includes(shot) || (hint !== undefined && hints.includes(hint));
}

// A conclusion as the board draws it. Its amounts only ever grow at the end,
// so each is named by its place in the line.
function factOf<Shot extends string>(
  conclusion: Conclusion<Shot, string>,
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

// The conclusions a lesson's board shows in a state of its film, drawn as
// the board draws them, in the order the lesson's content lists them; the
// title card shows none. The count is answered once the child got it right
// in this visit, or once the film has moved past the scene that asks for it.
// A hint lights what it uses only while the child is still answering.
export function boardFacts<State extends FilmState<Shot>, Shot extends string>(
  board: LessonBoard<State, string>,
  conclusions: readonly Conclusion<Shot, string>[],
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
    .filter((conclusion) => shown(conclusion, board, scenes, shot, state))
    .map((conclusion) => factOf(conclusion, board.pictures, moment));
}
