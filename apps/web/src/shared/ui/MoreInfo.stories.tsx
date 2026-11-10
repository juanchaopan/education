import type { Meta, StoryObj } from '@storybook/react-vite';
import { MoreInfo } from './MoreInfo';

const meta = {
  title: '公共部件/折叠说明',
  component: MoreInfo,
  args: {
    label: '邮件规则',
    children: '链接 24 小时有效。重新发送会让旧链接失效。',
  },
} satisfies Meta<typeof MoreInfo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Folded: Story = {};
