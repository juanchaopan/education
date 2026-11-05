import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChildAccount } from './ChildAccount';
const meta = {
  title: 'Family/ChildAccount',
  component: ChildAccount,
  args: {
    session: { role: 'child', nickname: '小鹿', csrfToken: 'x'.repeat(43) },
    onLogout: () => {},
  },
} satisfies Meta<typeof ChildAccount>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const LongNickname: Story = {
  args: { session: { ...meta.args.session, nickname: '喜欢慢慢探索的小小发现家' } },
};
export const Leaving: Story = { args: { pending: true } };
export const Retry: Story = { args: { error: '暂时无法确认退出，请重试。' } };
