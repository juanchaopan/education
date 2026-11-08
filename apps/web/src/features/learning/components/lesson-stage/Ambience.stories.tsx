import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ambience } from './Ambience';
import { StoryStage } from './StoryStage';

const meta = { title: 'Learning/Lesson stage/Ambience' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Fireflies: Story = {
  render: () => (
    <StoryStage>
      <Ambience kind="fireflies" />
    </StoryStage>
  ),
};

export const Petals: Story = {
  render: () => (
    <StoryStage>
      <Ambience kind="petals" />
    </StoryStage>
  ),
};
