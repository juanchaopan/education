import { VariationAnswer } from '../VariationAnswer';
import type { FlowAnswerProps } from './flow-answer';
import { FlowFinalAnswer } from './FlowFinalAnswer';

// 逐幕探究's answer part: in the scene that asks for it, the final count, with
// the authored hints beside it; then, in the variation's scenes, the guess
// and the reason, with the variation's own hints. A child says them out loud
// and confirms them; a parent previewing the lesson taps them.
export function SceneBySceneAnswer({ answerScene, shot, variation, go, ...on }: FlowAnswerProps) {
  if (shot === answerScene) return <FlowFinalAnswer {...on} />;
  if (!variation?.answering.includes(shot)) return null;
  return (
    <VariationAnswer
      mode={on.mode}
      play={variation}
      shot={shot}
      scope={on.scope}
      film={on.film}
      turn={on.turn}
      subtitle={on.subtitle}
      go={go}
    />
  );
}
