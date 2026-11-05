import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { CatalogNavigation } from './CatalogNavigation';

const path = { grade: '1年级', subject: '数学', category: '图形' };
const meta = {
  title: '学习界面/题库导航',
  component: CatalogNavigation,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    selection: {
      grade: { options: [path.grade], value: path.grade },
      subject: { options: [path.subject], value: path.subject },
      category: { options: [path.category], value: path.category },
    },
    problems: [
      { ...path, id: 'storybook-fixture-circle', title: '找一找圆形', version: 2, sequence: 1 },
      { ...path, id: 'storybook-fixture-square', title: '找一找正方形', version: 1, sequence: 2 },
    ],
    onChange: () => {},
  },
} satisfies Meta<typeof CatalogNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;
export const WithProblems: Story = {};
export const EmptyCategory: Story = { args: { problems: [] } };
