import { SpokenFinalAnswer } from '../SpokenFinalAnswer';
import type { FlowAnswerProps } from './flow-answer';

// 逐幕探究's answer part: in the scene that asks for it, the final count,
// said out loud and confirmed, with the authored hints beside it.
export function SceneBySceneAnswer({ answer, answerScene, shot, ...on }: FlowAnswerProps) {
  if (shot !== answerScene) return null;
  return (
    <SpokenFinalAnswer
      {...on}
      question={answer.question}
      words={answer.words}
      choices={answer.choices}
      hintIds={answer.hints}
    />
  );
}
