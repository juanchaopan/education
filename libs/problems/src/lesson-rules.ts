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
// scene as the child sees it, and the problem's own words, which speech
// recognition is told to expect in every scene.
export function sceneSteps<Scene extends string>(
  vocabulary: readonly string[],
  prompts: Readonly<Record<Scene, string>>,
) {
  const scenes = Object.keys(prompts) as Scene[];
  return Object.fromEntries(
    scenes.map((scene) => [scene, { prompt: prompts[scene], vocabulary }]),
  ) as Readonly<Record<Scene, FeedbackStep>>;
}
