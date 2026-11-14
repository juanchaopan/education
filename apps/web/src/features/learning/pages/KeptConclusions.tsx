import type { LessonContent } from '@education/problems/lesson-content';
import { ConclusionBoard } from '../components/lesson-stage/ConclusionBoard';
import { BoardPlace } from '../components/lesson-stage/LessonStage';
import type { FilmState } from '../interaction/lesson-film';
import { boardFacts, type AnswerProgress, type LessonBoard } from '../lessons/lesson-board';

// What the board reads of a lesson: its scenes in teaching order, the scene
// that asks for the count and the conclusions its content declares, and how
// its board draws them, if its way of teaching keeps them on the board.
type BoardLesson<State, Shot extends string> = Readonly<{
  content: Pick<LessonContent<Shot, string, string>, 'shots' | 'answerScene' | 'conclusions'>;
  board?: LessonBoard<State, string>;
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
  lesson: { content, board },
  state,
  progress,
}: Props<State, Shot>) {
  if (!board) return null;
  return (
    <BoardPlace>
      <ConclusionBoard facts={boardFacts(board, content.conclusions, content, state, progress)} />
    </BoardPlace>
  );
}
