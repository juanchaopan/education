import {
  drawnAmounts,
  inVariation,
  type Conclusion,
  type LessonContent,
} from '@education/problems/lesson-content';
import { boardAmount, type BoardPicture } from '../components/lesson-stage/board-layout';
import type { BoardFact } from '../components/lesson-stage/ConclusionBoard';
import type { FilmState } from '../interaction/lesson-film';

// How a lesson whose way of teaching keeps its conclusions on the board draws
// them: the things its amounts are drawn with, and, by conclusion id, when a
// conclusion counts as found in the scene that first shows it, for example
// once the scale is level. A conclusion with no such rule shows from its
// scene's start. The conclusions themselves are the lesson's content.
export type LessonBoard<State, Picture extends string> = Readonly<{
  pictures: Readonly<Record<Picture, BoardPicture>>;
  found?: Readonly<Record<string, (state: State) => boolean>>;
}>;

// How far the child has got with the final count: answered right in this
// visit, and the last of the authored hints received.
export type AnswerProgress = Readonly<{ answered: boolean; hint?: string }>;

// Where a lesson's scenes stand in teaching order, which one asks for the
// count, and its variation, as its content declares them.
export type BoardScenes<Shot extends string> = Pick<
  LessonContent<Shot, string, string>,
  'shots' | 'answerScene' | 'variation'
>;

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

// The variation is another problem: once it starts, the board keeps of the
// problem only the conclusions the variation still uses, beside the
// variation's own.
function inSight<Shot extends string>(
  { id, from }: Conclusion<Shot, string>,
  scenes: BoardScenes<Shot>,
  shot: Shot,
) {
  if (!scenes.variation || !inVariation(scenes, shot)) return true;
  return scenes.variation.keeps.includes(id) || inVariation(scenes, from);
}

function used<Shot extends string>(
  { uses = [], hints = [] }: Conclusion<Shot, string>,
  { shot, hint }: Moment<Shot>,
) {
  return uses.includes(shot) || (hint !== undefined && hints.includes(hint));
}

// The lesson check makes sure the board has a picture for every thing its
// conclusions draw, so a missing one is a definition the check never passed.
function pictureOf(pictures: Readonly<Record<string, BoardPicture>>, picture: string) {
  const found = pictures[picture];
  if (!found) throw new Error(`the conclusion board has no picture for ${picture}`);
  return found;
}

// What a conclusion of the variation is on the board: the condition it
// sets, 假如, or what that came to, 那么.
function kindOf<Shot extends string>(
  { id, supposed }: Conclusion<Shot, string>,
  { variation }: BoardScenes<Shot>,
): BoardFact['kind'] {
  if (supposed) return 'supposed';
  return variation?.result === id ? 'result' : undefined;
}

// A conclusion as the board draws it, with the amounts a lesson that keeps a
// board declares for every conclusion, and the one written on once the count
// is answered. Its amounts only ever grow at the end, so each is named by its
// place in the line.
function factOf<Shot extends string>(
  conclusion: Conclusion<Shot, string>,
  pictures: Readonly<Record<string, BoardPicture>>,
  scenes: BoardScenes<Shot>,
  moment: Moment<Shot>,
): BoardFact {
  const written = moment.answered ? conclusion.answer : undefined;
  const amounts = written ? drawnAmounts(conclusion) : (conclusion.amounts ?? []);
  return {
    id: conclusion.id,
    says: written?.says ?? conclusion.says,
    amounts: amounts.map(([count, picture, drawing], place) =>
      boardAmount(`${place}-${picture}`, count, pictureOf(pictures, picture), drawing),
    ),
    lit: used(conclusion, moment),
    kind: kindOf(conclusion, scenes),
  };
}

// The conclusions a lesson's board shows in a state of its film, drawn as
// the board draws them, in the order the lesson's content lists them; the
// title card shows none, and the variation only what it keeps beside its
// own. The count is answered once the child got it right in this visit, or
// once the film has moved past the scene that asks for it. A hint lights
// what it uses only while the child is still answering.
export function boardFacts<State extends FilmState<Shot>, Shot extends string>(
  board: LessonBoard<State, string>,
  conclusions: readonly Conclusion<Shot, string>[],
  scenes: BoardScenes<Shot>,
  state: State,
  progress: AnswerProgress,
): BoardFact[] {
  const shot = state.shot;
  if (shot === 'opening') return [];
  const { shots, answerScene } = scenes;
  const answered = progress.answered || shots.indexOf(answerScene) < shots.indexOf(shot);
  const moment = {
    shot,
    answered,
    hint: shot === answerScene && !answered ? progress.hint : undefined,
  };
  return conclusions
    .filter(
      (conclusion) =>
        shown(conclusion, board, scenes, shot, state) && inSight(conclusion, scenes, shot),
    )
    .map((conclusion) => factOf(conclusion, board.pictures, scenes, moment));
}
