import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FamilyExportCard } from './FamilyExportCard';

const meta = {
  component: FamilyExportCard,
  args: {
    pending: false,
    preparing: false,
    password: '',
    onPassword: fn(),
    onExport: fn(),
  },
} satisfies Meta<typeof FamilyExportCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmPassword: Story = {};
export const Preparing: Story = { args: { pending: true, preparing: true } };
export const Saved: Story = { args: { saved: 'family-data-2026-11-07.json' } };
export const Failed: Story = { args: { error: '请重新确认家长密码后再导出。' } };
