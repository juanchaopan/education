import type { Meta, StoryObj } from '@storybook/react-vite';
import { UpdateNotice } from './UpdateNotice';

const meta = {
  title: 'App/Update notice',
  component: UpdateNotice,
  args: { onRetry: () => {} },
} satisfies Meta<typeof UpdateNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WaitingForSave: Story = { args: { phase: 'held' } };
export const NotReadyYet: Story = { args: { phase: 'stuck' } };
