import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '../../../shared/ui/Avatar';
import { Icon } from '../../../shared/ui/Icon';
import { ShelfChoices } from './ShelfChoices';

const meta = {
  component: ShelfChoices,
  args: {
    legend: '书架',
    name: 'shelf',
    look: 'pill',
    value: 'library',
    onChange: () => {},
    choices: [
      { value: 'library', label: '书库', mark: <Icon name="library" /> },
      { value: 'family', label: '我的家庭', mark: <Icon name="home" /> },
      { value: 'mi', label: '小米', mark: <Avatar name="小米" />, apart: true },
      { value: 'le', label: '乐乐', mark: <Avatar name="乐乐" place={1} /> },
    ],
  },
} satisfies Meta<typeof ShelfChoices>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Shelves: Story = {};
export const OneChildChosen: Story = { args: { value: 'mi' } };
