import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssignToggle } from './AssignToggle';

const meta = {
  title: '公共部件/安排按钮',
  component: AssignToggle,
  args: { assigned: false, child: '小米', book: '学而思', onToggle: () => {} },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '12rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssignToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NotGiven: Story = {};
export const Given: Story = { args: { assigned: true } };
export const Pending: Story = { args: { assigned: true, pending: true } };
export const UnavailableGiven: Story = { args: { assigned: true, unavailable: true } };
export const UnavailableNotGiven: Story = { args: { unavailable: true } };
