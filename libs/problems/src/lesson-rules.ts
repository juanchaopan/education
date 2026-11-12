import type { LessonContent } from './lesson-content.js';
import type { AnsweringPolicy, FeedbackStep } from './plugin.js';

// Judges a final answer that is a count. The expected whole number is correct
// and any other whole number is a mistake; anything else, such as words, a
// fraction or a list, was not understood, so it is never counted as wrong.
export function wholeNumberAnswer(answer: number): AnsweringPolicy['checkCompletion'] {
  return (input) => {
    if (typeof input !== 'number' || !Number.isInteger(input)) return 'uncertain';
    return input === answer ? 'correct' : 'incorrect';
  };
}

// What a model may see for each scene of a lesson, by the scene's id: the
// scene's prompt as the lesson's content declares it, and the problem's own
// words, which speech recognition is told to expect in every scene.
export function sceneSteps<Shot extends string>({
  shots,
  scenes,
  vocabulary,
}: Pick<LessonContent<Shot, string, string>, 'shots' | 'scenes' | 'vocabulary'>) {
  return Object.fromEntries(
    shots.map((shot) => [shot, { prompt: scenes[shot].prompt, vocabulary }]),
  ) as Readonly<Record<Shot, FeedbackStep>>;
}
