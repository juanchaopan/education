import type { Meta, StoryObj } from '@storybook/react-vite';
import { FireflyHint } from './FireflyHint';
import { onStoryPainting } from './on-story-painting';

const meta = {
  title: 'Learning/Firefly hint',
  component: FireflyHint,
  decorators: [onStoryPainting],
  args: { left: 2, ready: true, onHint: () => {} },
} satisfies Meta<typeof FireflyHint>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TwoLeft: Story = {};
export const ThreeLeft: Story = { args: { left: 3 } };
export const OneLeft: Story = { args: { left: 1 } };
export const UsedUp: Story = { args: { left: 0 } };
// A hint is on its way, or the round is not known yet.
export const NotReady: Story = { args: { ready: false } };
