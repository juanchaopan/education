import type { Meta, StoryObj } from '@storybook/react-vite';
import { onStoryPainting } from './on-story-painting';
import { ReasonCapsule } from './ReasonCapsule';

const meta = {
  title: 'Learning/Reason capsule',
  component: ReasonCapsule,
  decorators: [onStoryPainting],
  args: {
    question: '和你猜的一样吗？说说为什么。',
    step: { kind: 'confirm', heard: '还是三组，只是每组变成了两根' },
    choices: { groups: '组数', 'per-group': '每组根数' },
    blocked: false,
    onListen: () => {},
    onFinish: () => {},
    onStopWaiting: () => {},
    onConfirm: () => {},
    onChoose: () => {},
    onRetry: () => {},
  },
} satisfies Meta<typeof ReasonCapsule>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Listening: Story = {
  args: { step: { kind: 'listening', message: '我在听，说出你的答案吧。说完停一下就好。' } },
};
// The sentence heard, with a green drop to agree and a honey one to say it
// again.
export const Heard: Story = {};
// A reason that was not clear: the teacher's words are the subtitle, and the
// honey drop asks for it again.
export const SayAgain: Story = { args: { step: { kind: 'ask', message: '', choices: false } } };
// Speech cannot be used, or two tries came to nothing: two rows of words to
// light, one over the other, and the drop that hands them in at the right.
export const WordsToTap: Story = { args: { step: { kind: 'ask', message: '', choices: true } } };
export const Judging: Story = { args: { step: { kind: 'judging' } } };
