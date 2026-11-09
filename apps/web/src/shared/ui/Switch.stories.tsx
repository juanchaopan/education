import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './Switch';

const meta = {
  title: '公共部件/开关',
  component: Switch,
  args: { label: '在这台设备上记住家庭码和昵称', checked: true, onChange: () => {} },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const On: Story = {};
export const Off: Story = { args: { checked: false } };
export const Disabled: Story = { args: { disabled: true } };
