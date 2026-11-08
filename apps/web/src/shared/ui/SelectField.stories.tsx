import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './Form';
import { SelectField } from './SelectField';

const meta = {
  title: '公共部件/下拉选择',
  component: SelectField,
  decorators: [
    (Story) => (
      <Form onSubmit={() => {}}>
        <Story />
      </Form>
    ),
  ],
  args: {
    id: 'story-child',
    label: '选择孩子',
    value: '',
    onChange: () => {},
    children: (
      <>
        <option value="">请选择</option>
        <option value="deer">小鹿</option>
      </>
    ),
  },
} satisfies Meta<typeof SelectField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Chosen: Story = { args: { value: 'deer' } };
export const Disabled: Story = { args: { disabled: true } };
