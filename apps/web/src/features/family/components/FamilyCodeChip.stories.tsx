import type { Meta, StoryObj } from '@storybook/react-vite';
import { FamilyCodeChip } from './FamilyCodeChip';
const meta = {
  title: '家庭/固定家庭码',
  component: FamilyCodeChip,
  args: { onCopy: () => {} },
} satisfies Meta<typeof FamilyCodeChip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Available: Story = { args: { code: 'ABCD-EFGH-JKMN' } };
export const Loading: Story = { args: { loading: true } };
export const Failed: Story = { args: { failed: true } };
export const Copied: Story = { args: { code: 'ABCD-EFGH-JKMN', notice: '已复制家庭码。' } };
export const CopyFallback: Story = {
  args: { code: 'ABCD-EFGH-JKMN', notice: '暂时无法自动复制，请长按或选中家庭码复制。' },
};
