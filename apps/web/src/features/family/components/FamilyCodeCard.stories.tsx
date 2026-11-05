import type { Meta, StoryObj } from '@storybook/react-vite';
import { FamilyCodeCard } from './FamilyCodeCard';
const meta = {
  title: '家庭/固定家庭码',
  component: FamilyCodeCard,
  args: { onCopy: () => {} },
} satisfies Meta<typeof FamilyCodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Available: Story = { args: { code: 'ABCD-EFGH-JKMN' } };
export const Loading: Story = { args: { loading: true } };
export const Failed: Story = { args: { failed: true } };
export const CopyFallback: Story = {
  args: { code: 'ABCD-EFGH-JKMN', notice: '暂时无法自动复制，请长按或选中上面的家庭码复制。' },
};
