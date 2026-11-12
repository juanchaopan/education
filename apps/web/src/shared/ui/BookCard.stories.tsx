import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssignToggle } from './AssignToggle';
import { BookCard, BookCardPlaceholder, type CardBook } from './BookCard';
import { ProgressTag } from './ProgressTag';

// Test fixtures only: these books never enter the problem list.
const book: CardBook = {
  name: '学而思',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 12,
};
const toggle = (assigned: boolean, unavailable = false) => (
  <AssignToggle
    assigned={assigned}
    unavailable={unavailable}
    child="小米"
    book="学而思"
    onToggle={() => {}}
  />
);

const meta = {
  title: '公共部件/书卡',
  component: BookCard,
  args: { book },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '13rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookCard>;
export default meta;
type Story = StoryObj<typeof meta>;

// On one child's shelf: not given, given with progress, and finished.
export const NotGiven: Story = { args: { action: toggle(false) } };
export const Given: Story = {
  args: { marks: <ProgressTag done={5} total={12} />, corner: 'top', action: toggle(true) },
};
export const Finished: Story = {
  args: { marks: <ProgressTag done={12} total={12} />, corner: 'top', action: toggle(true) },
};
export const Unavailable: Story = {
  args: {
    book: { ...book, name: '儿歌和童谣', subject: '语文', status: 'unavailable', problems: 11 },
    marks: <ProgressTag done={4} total={11} />,
    corner: 'top',
    action: toggle(true, true),
  },
};
export const FailedToGive: Story = {
  args: {
    action: toggle(false),
    note: <p role="alert">没安排上，再点一次。</p>,
  },
};

// On the family shelf: each child who has the book, in the bottom right.
export const Family: Story = {
  args: {
    book: { ...book, name: '思维训练', problems: 10 },
    corner: 'bottom',
    marks: (
      <>
        <ProgressTag done={10} total={10} child={{ name: '小米', place: 0 }} />
        <ProgressTag done={3} total={10} child={{ name: '乐乐', place: 1 }} />
      </>
    ),
  },
};

export const LongName: Story = {
  args: {
    book: { ...book, name: '一本书名特别特别长的看图写话练习册', subject: '语文', problems: 6 },
    action: toggle(false),
  },
};

// The default covers of each subject, and of a subject without its own.
export const DefaultCovers: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(4, 11rem)' }}>
      {['数学', '语文', '英语', '科学'].map((subject) => (
        <BookCard key={subject} book={{ ...book, name: `${subject}的书`, subject }} />
      ))}
    </div>
  ),
};

export const Loading: Story = { render: () => <BookCardPlaceholder /> };
