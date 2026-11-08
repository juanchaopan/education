import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Form } from './Form';
import { Hint } from './Hint';
import { TextField } from './TextField';

const meta = {
  title: '公共部件/表单',
  component: Form,
  args: {
    onSubmit: () => {},
    'aria-label': '家长登录',
    children: (
      <>
        <TextField id="story-email" label="登录邮箱" type="email" defaultValue="" />
        <TextField id="story-password" label="登录密码" type="password" defaultValue="" />
        <Button type="submit">登录</Button>
        <Hint>账号和学习进度不会因登录状态到期而删除。</Hint>
      </>
    ),
  },
} satisfies Meta<typeof Form>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SignIn: Story = {};
