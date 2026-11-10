import type { Meta, StoryObj } from '@storybook/react-vite';
import { AskMicrophone } from './AskMicrophone';
import { StoryPainting } from './StoryPainting';

const meta = {
  title: 'Learning/Ask microphone',
  component: AskMicrophone,
  decorators: [
    (Story) => (
      <StoryPainting>
        <Story />
      </StoryPainting>
    ),
  ],
  args: { label: '按住问小兔', holding: false, onPress: () => {}, onRelease: () => {} },
} satisfies Meta<typeof AskMicrophone>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Holding: Story = { args: { holding: true } };
// Someone else in the lesson has the microphone.
export const Disabled: Story = { args: { disabled: true } };
