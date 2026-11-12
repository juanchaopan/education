import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import type { CardBook } from '../../../shared/ui/BookCard';
import { BookRows, ChildBooksLinks } from './BookRows';

const book: CardBook = {
  name: '学而思',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 12,
};

it('ends each row with the progress, or 学完 once every problem is done', () => {
  render(
    <BookRows
      rows={[
        { key: 'a', book, detail: '小米 · 一年级数学', done: 5 },
        { key: 'b', book: { ...book, name: '古诗' }, detail: '乐乐 · 一年级语文', done: 12 },
      ]}
    />,
  );
  const [first, second] = screen.getAllByRole('listitem');
  expect(first).toHaveTextContent('学而思小米 · 一年级数学5 / 12');
  expect(second).toHaveTextContent('学完');
});

it('greys out an unavailable book and ends its row with its action', () => {
  render(
    <BookRows
      rows={[
        {
          key: 'a',
          book: { ...book, status: 'unavailable' },
          detail: '小米 · 暂时不可用',
          done: 5,
          action: <button type="button">取消</button>,
        },
      ]}
    />,
  );
  const row = screen.getByRole('listitem');
  expect(row).toHaveAttribute('data-unavailable');
  expect(row).not.toHaveTextContent('5 / 12');
  expect(screen.getByRole('button', { name: '取消' })).toBeVisible();
});

it("links to each child's books with how many there are", () => {
  render(
    <MemoryRouter>
      <ChildBooksLinks
        links={[{ childId: 'mi', nickname: '小米', place: 0, count: 4 }]}
        to={(childId) => `/books/${childId}`}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: '小米已安排 4 本' })).toHaveAttribute(
    'href',
    '/books/mi',
  );
});
