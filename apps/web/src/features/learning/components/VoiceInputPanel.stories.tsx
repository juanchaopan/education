import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { VoiceInputPanel } from './VoiceInputPanel';

const meta = {
  title: 'Learning/Voice input',
  component: VoiceInputPanel,
  args: {
    state: { status: 'idle' },
    onStart: fn(),
    onStop: fn(),
    onCancel: fn(),
    onGuide: fn(),
    onEdit: fn(),
    onConfirm: fn(),
    onDiscard: fn(),
  },
} satisfies Meta<typeof VoiceInputPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const OpeningMicrophone: Story = { args: { state: { status: 'starting' } } };
export const Recording: Story = { args: { state: { status: 'recording' } } };
export const Transcribing: Story = { args: { state: { status: 'transcribing' } } };
export const Review: Story = {
  args: { state: { status: 'review', text: '我把十二平均分成三份，每份是四。' } },
};
export const Unheard: Story = { args: { state: { status: 'unheard' } } };
export const MicrophoneDenied: Story = {
  args: { state: { status: 'unavailable', reason: 'denied' } },
};
export const NoRecording: Story = {
  args: { state: { status: 'unavailable', reason: 'unsupported' } },
};
export const NeedsParentConsent: Story = {
  args: { state: { status: 'fallback', reason: 'unauthorized' } },
};
export const TimedOut: Story = { args: { state: { status: 'fallback', reason: 'timeout' } } };
