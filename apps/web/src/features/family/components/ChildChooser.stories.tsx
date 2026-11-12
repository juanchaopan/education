import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CardBook } from '../../../shared/ui/BookCard';
import { ChildChooser, ChooserList, type ChooserChild } from './ChildChooser';

// Test fixtures only: these books and children never enter the problem list
// or a family.
const book: CardBook = {
  name: '思维训练',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 16,
};
const family: ChooserChild[] = [
  { childId: 'mi', nickname: '小米', place: 0, assigned: false, done: 3, pending: false },
  { childId: 'le', nickname: '乐乐', place: 1, assigned: true, done: 5, pending: false },
];

const meta = {
  component: ChooserList,
  args: { book, family, anchor: { top: 0, left: 0 }, onClose: () => {}, onToggle: () => {} },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', blockSize: '14rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChooserList>;
export default meta;
type Story = StoryObj<typeof meta>;

// The button under a book, with its list closed.
export const Closed: Story = {
  render: () => (
    <div style={{ inlineSize: '13rem' }}>
      <ChildChooser
        book={book}
        family={family}
        open={false}
        onOpen={() => {}}
        onClose={() => {}}
        onToggle={() => {}}
      />
    </div>
  ),
};
export const Open: Story = {};
export const Switching: Story = {
  args: { family: [{ ...family[0]!, pending: true }, family[1]!] },
};
export const Unavailable: Story = {
  args: { book: { ...book, name: '儿歌和童谣', subject: '语文', status: 'unavailable' } },
};
