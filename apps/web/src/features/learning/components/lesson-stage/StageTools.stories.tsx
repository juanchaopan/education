import type { Meta, StoryObj } from '@storybook/react-vite';
import { StageTools } from './StageTools';
import { StoryPainting } from './StoryPainting';

const meta = {
  title: 'Learning/Stage tools',
  component: StageTools,
  decorators: [
    (Story) => (
      <StoryPainting>
        <Story />
      </StoryPainting>
    ),
  ],
  args: {
    speaking: false,
    again: false,
    captions: true,
    sound: true,
    onReplay: () => {},
    onCaptions: () => {},
    onSound: () => {},
  },
} satisfies Meta<typeof StageTools>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Speaking: Story = { args: { speaking: true } };
export const LineDidNotPlay: Story = { args: { again: true } };
export const CaptionsOff: Story = { args: { captions: false } };
// Without sound the captions stay on and cannot be turned off.
export const SoundOff: Story = { args: { sound: false } };
