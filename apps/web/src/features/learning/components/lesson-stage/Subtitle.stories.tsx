import type { Meta, StoryObj } from '@storybook/react-vite';
import { teachers } from '../../media/teachers/teachers';
import { onStoryPainting } from './on-story-painting';
import { Subtitle } from './Subtitle';

const meta = {
  title: 'Learning/Subtitle',
  component: Subtitle,
  decorators: [onStoryPainting],
  args: {
    teacher: teachers.rabbit,
    text: '那一个苹果，能换几根黄瓜呢？碰一碰这个苹果。',
    onResume: () => {},
  },
} satisfies Meta<typeof Subtitle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Narrating: Story = {};
// The child pressed to ask; the narration waits under a pause mark.
export const HeldWhileTheChildSpeaks: Story = { args: { narration: 'held' } };
export const Paused: Story = { args: { narration: 'paused' } };
export const Thinking: Story = { args: { text: undefined, thinking: true } };
export const Confirming: Story = { args: { text: '我听到你说「九根」，是 9 吗？' } };
export const LongReply: Story = {
  args: {
    text: '你发现苹果那边沉下去了，说明苹果比空盘子重。我们把黄瓜一根一根放到右边的盘子里，看看放到第几根的时候，天平会变平，好不好？',
  },
};
