import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignInTabs } from './SignInTabs';

const meta = {
  title: 'Family/SignInTabs',
  component: SignInTabs,
  args: { tab: 'child', onTab: () => {}, children: <p>登录的表单在这里。</p> },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '28rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignInTabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Child: Story = {};
export const Parent: Story = { args: { tab: 'parent' } };
