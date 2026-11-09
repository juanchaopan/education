import type { Meta, StoryObj } from '@storybook/react-vite';
import { HoldToTalkButton } from './HoldToTalkButton';

const meta = {
  title: 'Learning/Hold to talk',
  component: HoldToTalkButton,
  args: {
    label: '有问题？按住问小兔',
    holding: false,
    onPress: () => {},
    onRelease: () => {},
  },
} satisfies Meta<typeof HoldToTalkButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Holding: Story = { args: { holding: true } };
export const Unavailable: Story = { args: { disabled: true } };
