import type { FlowAnswerProps } from './flow-answer';
import { FlowFinalAnswer } from './FlowFinalAnswer';

// 列式求解's answer part: in the scene that asks for them, every solution of
// the equation the lesson derived, judged as a set, with the authored hints
// beside it. A child says them out loud together and confirms them, or lights
// them and hands them in when speech cannot be used; a parent previewing the
// lesson lights and hands them in.
export function DeriveAndSolveAnswer({ answerScene, shot, ...on }: FlowAnswerProps) {
  if (shot !== answerScene) return null;
  return <FlowFinalAnswer {...on} every />;
}
