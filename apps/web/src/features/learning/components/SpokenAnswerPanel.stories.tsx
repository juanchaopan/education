import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Judgement } from '../data-access/useLessonAnswer';
import { answerStep } from '../interaction/spoken-answer';
import { SpokenAnswerPanel } from './SpokenAnswerPanel';

const open: Judgement = { status: 'open' };
const explain = (count: number) =>
  count === 3 ? '3 是一个苹果换的根数。右盘有三组黄瓜，再数数一共有几根。' : `${count} 根还不对。`;

const meta = {
  title: 'Learning/Spoken answer',
  component: SpokenAnswerPanel,
  args: {
    question: '一棵青菜和几根黄瓜一样重？',
    step: answerStep({ status: 'idle' }, open, explain),
    choices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    canHint: true,
    onSpeak: () => {},
    onStop: () => {},
    onCancel: () => {},
    onStopWaiting: () => {},
    onConfirm: () => {},
    onChoose: () => {},
    onRetry: () => {},
    onHint: () => {},
    onContinue: () => {},
  },
} satisfies Meta<typeof SpokenAnswerPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Listening: Story = {
  args: { step: answerStep({ status: 'recording' }, open, explain) },
};
export const ConfirmHeard: Story = {
  args: { step: answerStep({ status: 'review', text: '九根' }, open, explain) },
};
export const WrongCountWithHint: Story = {
  args: {
    step: answerStep(
      { status: 'idle' },
      { status: 'judged', outcome: 'incorrect', count: 3 },
      explain,
    ),
    hint: '先看第一架秤：一棵青菜和几个苹果一样重？',
  },
};
export const TapWithoutMicrophone: Story = {
  args: { step: answerStep({ status: 'unavailable', reason: 'denied' }, open, explain) },
};
export const Correct: Story = {
  args: {
    step: answerStep(
      { status: 'idle' },
      { status: 'judged', outcome: 'independent', count: 9 },
      explain,
    ),
    canHint: false,
  },
};
