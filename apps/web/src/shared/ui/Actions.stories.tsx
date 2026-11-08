import type { Meta, StoryObj } from '@storybook/react-vite';
import { Actions } from './Actions';
import { Button } from './Button';

const meta = {
  title: '公共部件/按钮行',
  component: Actions,
  args: {
    children: (
      <>
        <Button>重新生成注册 KEY</Button>
        <Button>撤销注册 KEY</Button>
        <Button>刷新 KEY 状态</Button>
      </>
    ),
  },
} satisfies Meta<typeof Actions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Several: Story = {};
