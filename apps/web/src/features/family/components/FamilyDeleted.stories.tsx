import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Card } from '../../../shared/ui/Card';
import { FamilyDeleted } from './FamilyDeleted';

const meta = {
  component: FamilyDeleted,
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
  args: { onRegister: fn() },
} satisfies Meta<typeof FamilyDeleted>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Deleted: Story = {};
