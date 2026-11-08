import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './Checkbox';

const meta = {
  title: '公共部件/复选框',
  component: Checkbox,
  args: { label: '在这台设备上记住家庭码和昵称', checked: true, onChange: () => {} },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Checked: Story = {};
export const Unchecked: Story = { args: { checked: false } };
export const Disabled: Story = { args: { disabled: true } };
