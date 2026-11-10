import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../../../shared/ui/Button';
import { DangerZone } from '../../../shared/ui/DangerZone';
import { ParentCard } from './ParentCard';

const meta = {
  title: '家长空间/卡片',
  component: ParentCard,
  args: {
    titleId: 'story-parent-card-title',
    icon: 'download',
    title: '导出家庭数据',
    children: <p>卡片的内容放在这里。</p>,
  },
} satisfies Meta<typeof ParentCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};
export const WithAction: Story = {
  args: { action: <Button variant="text">刷新</Button> },
};
export const Danger: Story = {
  args: {
    icon: 'trash',
    title: '删除家庭',
    tone: 'danger',
    children: (
      <DangerZone>
        <p>删除后无法恢复。</p>
        <Button variant="danger">永久删除家庭</Button>
      </DangerZone>
    ),
  },
};
