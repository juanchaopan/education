import type { Meta, StoryObj } from '@storybook/react-vite';
import { AttentionCue } from './AttentionCue';
import { StoryStage } from './StoryStage';

// A ball on the stories' table and a crate beside it, for the cues to point at.
function Things() {
  return (
    <>
      <rect x="440" y="410" width="400" height="70" rx="20" fill="#9a6a45" stroke="#5e3b24" />
      <circle cx="560" cy="380" r="32" fill="#e5b950" stroke="#8a5f3c" strokeWidth="3" />
      <rect x="840" y="360" width="140" height="96" rx="14" fill="#7d5536" stroke="#5e3b24" />
    </>
  );
}

const meta = { title: 'Learning/Lesson stage/Attention cue' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Arrow: Story = {
  render: () => (
    <StoryStage>
      <Things />
      <AttentionCue kind="arrow" from={[560, 340]} to={[910, 350]} />
    </StoryStage>
  ),
};

export const Finger: Story = {
  render: () => (
    <StoryStage>
      <Things />
      <AttentionCue kind="finger" at={[560, 372]} />
    </StoryStage>
  ),
};

export const Pulse: Story = {
  render: () => (
    <StoryStage>
      <Things />
      <AttentionCue kind="pulse" at={[560, 380]} radius={52} />
    </StoryStage>
  ),
};
