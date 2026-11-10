import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './Form';
import { TextField } from './TextField';

const meta = {
  title: '公共部件/输入框',
  component: TextField,
  decorators: [
    (Story) => (
      <Form onSubmit={() => {}}>
        <Story />
      </Form>
    ),
  ],
  args: { id: 'story-nickname', label: '我的昵称', value: '', onChange: () => {} },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { value: '小鹿' } };
export const WithHint: Story = { args: { hint: '用 1–12 个汉字、字母或数字，不需要填真实姓名。' } };
export const WithIcon: Story = {
  args: {
    id: 'story-email',
    label: '登录邮箱',
    type: 'email',
    icon: 'mail',
    value: 'parent@example.test',
  },
};
export const Disabled: Story = { args: { value: '小鹿', disabled: true } };
