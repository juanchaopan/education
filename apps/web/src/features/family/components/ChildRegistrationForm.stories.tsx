import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChildRegistrationForm } from './ChildRegistrationForm';
const meta = {
  title: '家庭/孩子注册',
  component: ChildRegistrationForm,
  args: { registrationKey: '', nickname: '', pin: '', onChange: () => {}, onSubmit: () => {} },
} satisfies Meta<typeof ChildRegistrationForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Filled: Story = {
  args: { registrationKey: 'ABCD-EFGH-JKMN-PQRS', nickname: '小探索家', pin: '018274' },
};
export const Pending: Story = {
  args: { registrationKey: 'ABCD-EFGH-JKMN-PQRS', nickname: '小探索家', pending: true },
};
export const InvalidKey: Story = {
  args: {
    registrationKey: 'ABCD-EFGH-JKMN-PQRS',
    error: '这个 KEY 已使用、已撤销或已过期。请家长生成新的 KEY。',
  },
};
export const WeakPin: Story = {
  args: {
    registrationKey: 'ABCD-EFGH-JKMN-PQRS',
    nickname: '小探索家',
    error: '试试不全相同、也不连续的六位数字，会更安全。',
  },
};
export const Retry: Story = {
  args: {
    error: '暂时无法确认结果。请保留当前输入，稍后再点一次“加入家庭”；重复提交不会创建第二个账号。',
  },
};
export const LongNickname: Story = { args: { nickname: '热爱探索世界的小小探索家们' } };
