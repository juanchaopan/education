import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ChildBookCard } from './ChildBookCard';
import { childBook, fixtureNow } from './child-book-fixtures';

const meta = {
  title: 'Family/ChildBookCard',
  component: ChildBookCard,
  args: { book: childBook(), open: false, onToggle: () => {}, now: fixtureNow },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ maxInlineSize: '50rem' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ChildBookCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { open: true } };
export const New: Story = {
  args: {
    book: childBook({
      id: 'g1-chinese-pinyin',
      name: '拼音乐园',
      subject: '语文',
      fresh: true,
      done: 0,
      studiedAt: null,
      assignedAt: fixtureNow.toISOString(),
    }),
  },
};
export const Finished: Story = { args: { book: childBook({ name: '思维训练', done: 5 }) } };
export const Unavailable: Story = {
  args: { book: childBook({ name: '儿歌和童谣', subject: '语文', status: 'unavailable' }) },
};
export const UnavailableOpen: Story = { args: { ...Unavailable.args, open: true } };
export const LongTitles: Story = {
  args: {
    open: true,
    book: childBook({
      items: [
        {
          id: 'fixture-long',
          version: 1,
          title: '小熊过河一次只能带两只小动物，至少要来回几次才能把大家都送过去',
          done: false,
        },
        { id: 'fixture-short', version: 1, title: '数星星', done: true },
      ],
    }),
  },
};
