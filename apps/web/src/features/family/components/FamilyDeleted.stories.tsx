import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FamilyDeleted } from './FamilyDeleted';
import { inCard } from './story-card';

const meta = {
  component: FamilyDeleted,
  decorators: [inCard],
  args: { onRegister: fn() },
} satisfies Meta<typeof FamilyDeleted>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Deleted: Story = {};
