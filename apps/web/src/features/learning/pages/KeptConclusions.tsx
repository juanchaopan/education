import { ConclusionBoard } from '../components/lesson-stage/ConclusionBoard';
import { BoardPlace } from '../components/lesson-stage/LessonStage';
import type { FilmState } from '../interaction/lesson-film';
import { boardFacts, type AnswerProgress, type LessonBoard } from '../lessons/lesson-board';
import type { LessonAnswer, Script } from '../lessons/lesson-definition';

// What the board reads of a lesson: its scenes in teaching order, the scene
// that asks for the count, and the conclusions it keeps, if its way of
// teaching keeps them on the board.
type BoardLesson<State, Shot extends string> = Readonly<{
  script: Pick<Script<Shot, string>, 'shots'>;
  answer: Pick<LessonAnswer<Shot>, 'shot'>;
  board?: LessonBoard<State, Shot, string>;
}>;

type Props<State extends FilmState<Shot>, Shot extends string> = {
  lesson: BoardLesson<State, Shot>;
  // The film's state on screen, and how far the child has got with the count.
  state: State;
  progress: AnswerProgress;
};

// The conclusions a lesson keeps in sight, on the board along the top of its
// picture, as far as the film on screen has found them. A lesson that keeps
// no board shows none.
export function KeptConclusions<State extends FilmState<Shot>, Shot extends string>({
  lesson: { script, answer, board },
  state,
  progress,
}: Props<State, Shot>) {
  if (!board) return null;
  const scenes = { shots: script.shots, answer: answer.shot };
  return (
    <BoardPlace>
      <ConclusionBoard facts={boardFacts(board, scenes, state, progress)} />
    </BoardPlace>
  );
}
