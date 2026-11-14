import type { FlowAnswerProps } from './flow-answer';
import { FlowFinalAnswer } from './FlowFinalAnswer';

// 逐幕探究's answer part: in the scene that asks for it, the final count, with
// the authored hints beside it. A child says it out loud and confirms it; a
// parent previewing the lesson taps it.
export function SceneBySceneAnswer({ answerScene, shot, ...on }: FlowAnswerProps) {
  if (shot !== answerScene) return null;
  return <FlowFinalAnswer {...on} />;
}
