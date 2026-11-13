import type { Meta, StoryObj } from '@storybook/react-vite';
import { FamilyCodeCard } from './FamilyCodeCard';

const meta = {
  title: '家长空间/家庭码',
  component: FamilyCodeCard,
  args: { code: 'K7M4-Q2AB-9XRT', onCopy: () => {} },
} satisfies Meta<typeof FamilyCodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithCode: Story = {};
export const Copied: Story = { args: { notice: '已复制家庭码。' } };
export const NoChildYet: Story = { args: { code: undefined } };
export const Loading: Story = { args: { code: undefined, loading: true } };
export const NotRead: Story = { args: { code: undefined, failed: true } };
