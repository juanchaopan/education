import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { NarrationCaption } from './NarrationCaption';

const meta = {
  title: 'Learning/Narration caption',
  component: NarrationCaption,
  args: {
    text: '把十二个苹果平均分给三只小兔，每只小兔分到几个？',
    status: 'ready',
    onReplay: fn(),
    onPause: fn(),
    onResume: fn(),
  },
} satisfies Meta<typeof NarrationCaption>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Playing: Story = { args: { status: 'playing' } };
export const Paused: Story = { args: { status: 'paused' } };
export const NoSound: Story = { args: { status: 'silent' } };
export const SoundFailed: Story = { args: { status: 'failed' } };
