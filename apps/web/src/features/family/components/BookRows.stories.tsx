import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import type { CardBook } from '../../../shared/ui/BookCard';
import { BookRows, ChildBooksLinks } from './BookRows';

// Test fixtures only: these books never enter the problem list.
const book = (name: string, fields: Partial<CardBook> = {}): CardBook => ({
  name,
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 12,
  ...fields,
});

const meta = {
  component: BookRows,
  args: {
    rows: [
      { key: 'a', book: book('学而思'), detail: '小米 · 一年级数学', done: 5 },
      {
        key: 'b',
        book: book('自然拼读', { subject: '英语' }),
        detail: '乐乐 · 一年级英语',
        done: 0,
      },
      {
        key: 'c',
        book: book('古诗诵读', { subject: '语文' }),
        detail: '小米 · 一年级语文',
        done: 12,
      },
      {
        key: 'd',
        book: book('儿歌和童谣', { subject: '语文', status: 'unavailable' }),
        detail: '小米 · 暂时不可用',
        done: 4,
        action: <Button variant="secondary">取消</Button>,
      },
    ],
  },
} satisfies Meta<typeof BookRows>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Given: Story = {};
export const WithLinks: Story = {
  render: (args) => (
    <MemoryRouter>
      <BookRows {...args} />
      <ChildBooksLinks
        links={[
          { childId: 'mi', nickname: '小米', place: 0, count: 4 },
          { childId: 'le', nickname: '乐乐', place: 1, count: 2 },
        ]}
        to={(childId) => `/family/practice?child=${childId}&state=assigned`}
      />
    </MemoryRouter>
  ),
};
