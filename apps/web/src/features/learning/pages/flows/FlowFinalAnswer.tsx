import { SpokenFinalAnswer } from '../SpokenFinalAnswer';
import { TappedFinalAnswer } from '../TappedFinalAnswer';
import type { FlowAnswerProps } from './flow-answer';

type Props = Omit<FlowAnswerProps, 'answerScene' | 'shot'> & {
  // The answer is every number that fits, sent as a list; otherwise it is
  // one number.
  every?: boolean;
};

// A lesson flow's final answer with the authored hints beside it: a child
// says it out loud and confirms it, a parent previewing the lesson taps it.
export function FlowFinalAnswer({ mode, answer, every, ...on }: Props) {
  const settings = {
    question: answer.question,
    words: answer.words,
    every,
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
