import type { ComponentProps } from 'react';
import type { LearningScope } from '../../data-access/learning-request';
import type { AnswerEvents } from '../../data-access/useLessonAnswer';
import type { Subtitle } from '../../interaction/subtitle';
import type { LessonAnswer } from '../../lessons/lesson-definition';
import type { MicrophoneTurn } from '../../voice/microphone-turn';
import type { SpokenFinalAnswer } from '../SpokenFinalAnswer';

// What a lesson flow's answer part is given on a signed-in child's lesson
// page: the lesson's answer settings, the scene on screen, the child's
// scope, the teacher's voice and the lesson's tones, the lesson's one
// microphone and the teacher's subtitle, what the page hears of hints and a
// count judged right, and how the film plays on once the answer is done.
export type FlowAnswerProps = Readonly<{
  answer: LessonAnswer<string>;
  shot: string;
  scope: LearningScope;
  film: ComponentProps<typeof SpokenFinalAnswer>['film'];
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  events?: AnswerEvents;
  onDone: () => void;
}>;
