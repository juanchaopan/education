import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';
import { iconNames } from './icons';

const meta = {
  title: '公共部件/图标',
  component: Icon,
  args: { name: 'spark' },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};
export const Badge: Story = { args: { badge: true } };
export const AllIcons: Story = {
  render: () => (
    <ul aria-label="全部图标">
      {iconNames.map((name) => (
        <li key={name}>
          <Icon name={name} /> {name}
        </li>
      ))}
    </ul>
  ),
};
