import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { familyDeletionPhrase } from '@education/contracts';
import { FamilyDeletionCard } from './FamilyDeletionCard';

const meta = {
  component: FamilyDeletionCard,
  args: {
    pending: false,
    recorded: false,
    phrase: '',
    password: '',
    onPhrase: fn(),
    onPassword: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof FamilyDeletionCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NotConfirmed: Story = {};
export const ReadyToDelete: Story = {
  args: { phrase: familyDeletionPhrase, password: 'synthetic-password' },
};
export const Deleting: Story = {
  args: { phrase: familyDeletionPhrase, password: 'synthetic-password', pending: true },
};
export const Recorded: Story = { args: { recorded: true } };
export const Failed: Story = {
  args: {
    error:
      '暂时无法确认删除是否已经受理，请稍后重新登录查看。如果还能登录，说明家庭没有删除，可以再试一次。',
  },
};
