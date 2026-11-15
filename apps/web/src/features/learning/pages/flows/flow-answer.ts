import type { ProblemMode } from '@education/contracts';
import type { LearningScope } from '../../data-access/learning-request';
import type { AnswerEvents } from '../../data-access/useAnswerHints';
import type { Subtitle } from '../../interaction/subtitle';
import type { ListeningFilm } from '../../interaction/useListening';
import type { LessonAnswer, VariationPlay } from '../../lessons/lesson-definition';
import type { MicrophoneTurn } from '../../voice/microphone-turn';

// What a lesson flow's answer part is given on the lesson page: whether a
// child practises or a parent previews, the lesson's answer settings and the
// scene its content asks for the answer in, its variation as the page plays
// it, if it has one, the scene on screen, the session's scope, the teacher's
// voice and the lesson's tones, the lesson's one microphone and the
// teacher's subtitle, what the page hears of hints and a count judged right,
// how the film plays on once the answer is done, and how it moves to another
// scene.
export type FlowAnswerProps = Readonly<{
  mode: ProblemMode;
  answer: LessonAnswer;
  answerScene: string;
  variation?: VariationPlay;
  shot: string;
  scope: LearningScope;
  film: ListeningFilm;
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  events?: AnswerEvents;
  onDone: () => void;
  go: (shot: string) => void;
}>;
