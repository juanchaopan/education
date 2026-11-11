import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnswerCapsule } from './AnswerCapsule';
import { onStoryPainting } from './on-story-painting';

const meta = {
  title: 'Learning/Answer capsule',
  component: AnswerCapsule,
  decorators: [onStoryPainting],
  args: {
    question: '一棵青菜和几根黄瓜一样重？',
    step: { kind: 'confirm', heard: '九根', count: 9 },
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

export const Listening: Story = {
  args: { step: { kind: 'listening', message: '我在听，说出你的答案吧。说完停一下就好。' } },
};
export const Hearing: Story = { args: { step: { kind: 'hearing', message: '' } } };
export const Confirm: Story = {};
export const Judging: Story = { args: { step: { kind: 'judging' } } };
export const SendFailed: Story = {
  args: { step: { kind: 'failed', message: '暂时连不上，请重试。' } },
};
export const SayAgain: Story = { args: { step: { kind: 'ask', message: '', choices: false } } };
// Speech proved unusable, so numbers to tap sit beside the honey drop.
export const NumbersToTap: Story = { args: { step: { kind: 'ask', message: '', choices: true } } };
export const Correct: Story = { args: { step: { kind: 'done', assisted: false } } };
