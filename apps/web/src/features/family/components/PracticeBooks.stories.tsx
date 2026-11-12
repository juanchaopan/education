import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import type { PracticeBook } from '@education/contracts';
import { PracticeBooks } from './PracticeBooks';

// Test fixtures only: these books and problems never enter the problem list.
const book = (
  id: string,
  name: string,
  subject: string,
  done: boolean[],
  status: PracticeBook['status'] = 'available',
): PracticeBook => ({
  id,
  name,
  grade: '一年级',
  subject,
  cover: null,
  status,
  problems: done.length,
  done: done.filter(Boolean).length,
  items: done.map((finished, place) => ({
    id: `${id}-${place + 1}`,
    version: 1,
    title: `第 ${place + 1} 道测试题`,
    done: finished,
  })),
});

const meta = {
  component: PracticeBooks,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    books: [
      book('fixture-thinking', '思维训练', '数学', [true, true, false, false]),
      book('fixture-poems', '古诗诵读', '语文', [true, true, true]),
      book('fixture-songs', '儿歌和童谣', '语文', [true, false, false], 'unavailable'),
    ],
  },
} satisfies Meta<typeof PracticeBooks>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Books: Story = {};
