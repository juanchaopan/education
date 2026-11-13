import { SpokenFinalAnswer } from '../SpokenFinalAnswer';
import { TappedFinalAnswer } from '../TappedFinalAnswer';
import type { FlowAnswerProps } from './flow-answer';

// 逐幕探究's answer part: in the scene that asks for it, the final count, with
// the authored hints beside it. A child says it out loud and confirms it; a
// parent previewing the lesson taps it.
export function SceneBySceneAnswer({ mode, answer, answerScene, shot, ...on }: FlowAnswerProps) {
  if (shot !== answerScene) return null;
  const settings = {
    question: answer.question,
    words: answer.words,
    choices: answer.choices,
    hintIds: answer.hints,
  };
  if (mode === 'preview')
    return (
      <TappedFinalAnswer
        {...settings}
        scope={on.scope}
        subtitle={on.subtitle}
        events={on.events}
        onDone={on.onDone}
      />
    );
  return <SpokenFinalAnswer {...on} {...settings} />;
}
