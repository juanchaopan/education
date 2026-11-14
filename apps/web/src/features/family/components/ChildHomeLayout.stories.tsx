import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { BookFilters } from './BookFilters';
import { BookListFoot } from './BookListFoot';
import { ChildBookCard } from './ChildBookCard';
import { ChildHomeLayout } from './ChildHomeLayout';
import { ChildTopBar } from './ChildTopBar';
import { childBook, childBookCounts, fixtureNow } from './child-book-fixtures';

// Stand-ins for the lesson pictures, drawn here so the story shows the
// layout without the picture library, which lives in another feature.
const svg = (body: string, box: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`)}`;
const art = {
  day: svg(
    '<rect width="16" height="9" fill="#e9d2a8"/><rect y="6" width="16" height="3" fill="#a9b98f"/>',
    '0 0 16 9',
  ),
  night: svg(
    '<rect width="16" height="9" fill="#24343a"/><rect y="6" width="16" height="3" fill="#3d3a2c"/>',
    '0 0 16 9',
  ),
  teacher: svg('<ellipse cx="2" cy="3" rx="2" ry="3" fill="#f3e6d6"/>', '0 0 4 6'),
};

const books = [
  childBook({
    id: 'g1-chinese-pinyin',
    name: '拼音乐园',
    subject: '语文',
    fresh: true,
    done: 0,
    studiedAt: null,
    assignedAt: fixtureNow.toISOString(),
  }),
  childBook(),
  childBook({ id: 'g1-math-thinking', name: '思维训练', done: 5 }),
];

const meta = {
  title: 'Family/ChildHome',
  component: ChildHomeLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    art,
    topBar: <ChildTopBar nickname="小米" leaving={false} onLogout={() => {}} />,
    children: (
      <>
        <BookFilters counts={childBookCounts()} onFilter={() => {}} />
        <div
          style={{ display: 'grid', gap: 'var(--space-5)', paddingBlockStart: 'var(--space-4)' }}
        >
          {books.map((book, place) => (
            <ChildBookCard
              key={book.id}
              book={book}
              open={place === 1}
              onToggle={() => {}}
              now={fixtureNow}
            />
          ))}
        </div>
        <BookListFoot state="more" touch={false} onMore={() => {}} />
      </>
    ),
  },
} satisfies Meta<typeof ChildHomeLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Books: Story = {};
