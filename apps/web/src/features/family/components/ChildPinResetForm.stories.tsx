import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChildPinResetForm } from './ChildPinResetForm';
const meta = {
  title: 'Family/ChildPinReset',
  component: ChildPinResetForm,
  args: {
    child: { id: '00000000-0000-4000-8000-000000000001', nickname: '小鹿', credentialVersion: 1 },
    pin: '',
    confirmation: '',
    onPin: () => {},
    onConfirmation: () => {},
    onSubmit: () => {},
    onCancel: () => {},
  },
} satisfies Meta<typeof ChildPinResetForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Pending: Story = { args: { pending: true } };
