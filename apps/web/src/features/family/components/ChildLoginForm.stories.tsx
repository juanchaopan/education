import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChildLoginForm } from './ChildLoginForm';
const meta = {
  title: 'Family/ChildLogin',
  component: ChildLoginForm,
  args: {
    familyCode: '',
    nickname: '',
    pin: '',
    remember: true,
    onChange: () => {},
    onRemember: () => {},
    onSubmit: () => {},
  },
} satisfies Meta<typeof ChildLoginForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FirstDevice: Story = {};
export const Remembered: Story = { args: { familyCode: 'ABCD-EFGH-JKMN', nickname: '小鹿' } };
export const Waiting: Story = { args: { ...Remembered.args, pending: true } };
export const TryAgain: Story = {
  args: {
    ...Remembered.args,
    error: '家庭码、昵称或 PIN 不正确，请检查后重试，也可以请家长帮忙。',
  },
};
export const RateLimited: Story = {
  args: { ...Remembered.args, error: '尝试有点多，休息一会儿再试，也可以请家长帮忙。' },
};
