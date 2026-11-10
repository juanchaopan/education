import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { DangerZone } from './DangerZone';

const meta = {
  title: '公共部件/危险区',
  component: DangerZone,
  args: {
    children: (
      <>
        <p>删除后无法恢复，所有设备上的登录都会退出。</p>
        <Button variant="danger">永久删除家庭</Button>
      </>
    ),
  },
} satisfies Meta<typeof DangerZone>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LastStep: Story = {};
