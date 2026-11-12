import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnswerCapsule } from './AnswerCapsule';
import { onStoryPainting } from './on-story-painting';

const meta = {
  title: 'Learning/Answer capsule',
  component: AnswerCapsule,
  decorators: [onStoryPainting],
  args: {
    question: '一棵青菜和几根黄瓜一样重？',
    step: { kind: 'confirm', heard: '九根', said: [9] },
    unit: '根',
    choices: [6, 7, 8, 9, 10, 12],
    blocked: false,
    onListen: () => {},
    onFinish: () => {},
    onStopWaiting: () => {},
    onConfirm: () => {},
    onChoose: () => {},
    onRetry: () => {},
    onContinue: () => {},
  },
} satisfies Meta<typeof AnswerCapsule>;
export default meta;
type Story = StoryObj<typeof meta>;

// An answer that is every number that fits, such as every time two points
// are four squares apart.
const every = {
  question: 'M 和 N 什么时候相距四格？',
  unit: '秒',
  every: true,
  choices: [2, 4, 6, 8, 10, 12, 14, 16],
};

export const Listening: Story = {
  args: { step: { kind: 'listening', message: '我在听，说出你的答案吧。说完停一下就好。' } },
};
export const Hearing: Story = { args: { step: { kind: 'hearing', message: '' } } };
export const Confirm: Story = {};
// Two numbers heard for an answer that is every number that fits.
export const ConfirmEvery: Story = {
  args: { ...every, step: { kind: 'confirm', heard: '六秒和十四秒', said: [6, 14] } },
};
export const Judging: Story = { args: { step: { kind: 'judging' } } };
export const SendFailed: Story = {
  args: { step: { kind: 'failed', message: '暂时连不上，请重试。' } },
};
export const SayAgain: Story = { args: { step: { kind: 'ask', message: '', choices: false } } };
// Speech proved unusable, so numbers to tap sit beside the honey drop.
export const NumbersToTap: Story = { args: { step: { kind: 'ask', message: '', choices: true } } };
// Speech proved unusable for an answer that is every number that fits: the
// numbers light up one by one and are handed in together.
export const NumbersToLight: Story = {
  args: { ...every, step: { kind: 'ask', message: '', choices: true } },
};
export const Correct: Story = { args: { step: { kind: 'done', assisted: false } } };
