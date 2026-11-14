import type { Meta, StoryObj } from '@storybook/react-vite';
import { RaisedButton } from './RaisedButton';

const meta = {
  title: '公共部件/凸起按钮',
  component: RaisedButton,
  args: { children: '加载更多', onClick: () => {} },
} satisfies Meta<typeof RaisedButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};
export const Chosen: Story = { args: { chosen: true, children: '全部' } };
export const Disabled: Story = { args: { disabled: true, children: '加载中…' } };
export const Row: Story = {
  args: { shape: 'block', children: '全部 12 道' },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '22rem' }}>
        <Story />
      </div>
    ),
  ],
};
