import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpokenAnswerPanel } from './SpokenAnswerPanel';

const meta = {
  title: 'Learning/Spoken answer',
  component: SpokenAnswerPanel,
  args: {
    question: '一棵青菜和几根黄瓜一样重？',
    step: { kind: 'ask', message: '', choices: false },
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
  args: { step: { kind: 'listening', message: '正在听。说完点「说完了」。' } },
};
export const ConfirmHeard: Story = {
  args: { step: { kind: 'confirm', heard: '九根', count: 9 } },
};
export const WrongCountWithHint: Story = {
  args: {
    step: {
      kind: 'ask',
      message: '3 是一个苹果换的根数。右盘有三组黄瓜，再数数一共有几根。',
      choices: false,
    },
    hint: '先看第一架秤：一棵青菜和几个苹果一样重？',
  },
};
export const TapWithoutMicrophone: Story = {
  args: {
    step: { kind: 'ask', message: '没有拿到麦克风权限。可以点下面的数字回答。', choices: true },
  },
};
export const Correct: Story = {
  args: { step: { kind: 'done', assisted: false }, canHint: false },
};
