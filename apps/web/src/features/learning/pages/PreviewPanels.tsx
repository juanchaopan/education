import type { LearningScope } from '../data-access/learning-request';
import type { AnswerEvents } from '../data-access/useAnswerHints';
import type { FilmState } from '../interaction/lesson-film';
import type { Subtitle } from '../interaction/subtitle';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { shotAfter, type LessonDefinition } from '../lessons/lesson-definition';
import type { MicrophoneTurn } from '../voice/microphone-turn';
import { flowAnswers } from './flows/flow-answers';

type Props<Shot extends string> = {
  lesson: Pick<
    LessonDefinition<FilmState<Shot>, Shot, string, unknown, string, object>,
    'content' | 'script' | 'answer'
  >;
  scope: LearningScope;
  film: Pick<
    LessonFilm<FilmState<Shot>, Shot, unknown>,
    'state' | 'go' | 'telling' | 'speaking' | 'failure' | 'chime'
  >;
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  answerEvents?: AnswerEvents;
};

// The controls a parent previewing a lesson has in the picture beside the
// film's own: only the answer part of the lesson's flow, tapped, with its
// hints. No microphone, no questions to the teacher and no draft: the
// preview keeps nothing. A correct answer plays the film on from the scene
// after the answer, as it does for a child.
export function PreviewPanels<Shot extends string>({
  lesson,
  scope,
  film,
  turn,
  subtitle,
  answerEvents,
}: Props<Shot>) {
  const { shot } = film.state;
  if (shot === 'opening') return null;
  const { answer, script, content } = lesson;
  const { answerScene } = content;
  const FlowAnswer = flowAnswers[content.flow];
  return (
    <FlowAnswer
      mode="preview"
      answer={answer}
      answerScene={answerScene}
      shot={shot}
      scope={scope}
      film={film}
      turn={turn}
      subtitle={subtitle}
      events={answerEvents}
      onDone={() => {
        const next = shotAfter(script, answerScene);
        if (next) film.go(next);
      }}
    />
  );
}
