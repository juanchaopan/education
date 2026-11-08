import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hint } from './Hint';

const meta = {
  title: '公共部件/说明',
  component: Hint,
  args: { children: '重新生成会撤销旧 KEY；已注册孩子不受影响。' },
} satisfies Meta<typeof Hint>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Short: Story = {};
export const LongText: Story = {
  args: {
    children: '只会重试服务商明确暂时拒绝的邮件，最多三次；不确定是否送达时不会重复投递。'.repeat(
      3,
    ),
  },
};
