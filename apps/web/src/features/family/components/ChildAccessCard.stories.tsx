import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChildAccessCard } from './ChildAccessCard';
const child = {
  id: '00000000-0000-4000-8000-000000000001',
  nickname: '小鹿',
  credentialVersion: 1,
};
const meta = {
  title: 'Family/ChildAccess',
  component: ChildAccessCard,
  args: {
    loading: false,
    pending: false,
    pin: '',
    confirmation: '',
    password: '',
    status: { children: [child], reauthenticationRequired: false },
    onSelect: () => {},
    onPin: () => {},
    onConfirmation: () => {},
    onPassword: () => {},
    onConfirm: () => {},
    onSubmit: () => {},
    onCancel: () => {},
    onRefresh: () => {},
  },
} satisfies Meta<typeof ChildAccessCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Children: Story = {};
export const Empty: Story = { args: { status: { children: [], reauthenticationRequired: false } } };
export const ConfirmParent: Story = {
  args: { status: { children: [child], reauthenticationRequired: true } },
};
export const SetPin: Story = { args: { selected: child } };
export const Loading: Story = { args: { status: undefined, loading: true } };
export const Unavailable: Story = {
  args: { status: undefined, error: '暂时无法确认孩子状态，请刷新重试。' },
};
export const Completed: Story = {
  args: { notice: '已重置小鹿的 PIN，旧登录已退出。请把新 PIN 告诉孩子。' },
};
