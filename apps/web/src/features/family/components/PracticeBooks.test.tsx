import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import type { PracticeBook } from '@education/contracts';
import { PracticeBooks } from './PracticeBooks';

const book = (fields: Partial<PracticeBook> = {}): PracticeBook => ({
  id: 'fixture-thinking',
  name: '思维训练',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 2,
  done: 1,
  items: [
    { id: 'fixture-one', version: 2, title: '第一道', done: true },
    { id: 'fixture-two', version: 1, title: '第二道', done: false },
  ],
  ...fields,
});

const show = (books: PracticeBook[]) =>
  render(
    <MemoryRouter>
      <PracticeBooks books={books} />
    </MemoryRouter>,
  );

it('lists each book with its progress and every problem, ticking those done', () => {
  show([book()]);
  const group = screen.getByRole('region', { name: '思维训练' });
  expect(group).toHaveTextContent('一年级 · 数学');
  expect(group).toHaveTextContent('1 / 2');
  const [first, second] = within(group).getAllByRole('listitem');
  expect(within(first!).getByRole('link', { name: '第一道' })).toHaveAttribute(
    'href',
    '/problems/fixture-one/2',
  );
  expect(first).toHaveTextContent('做完了');
  expect(second).not.toHaveTextContent('做完了');
});

it('says 学完 once every problem is done', () => {
  show([book({ done: 2 })]);
  expect(screen.getByRole('region', { name: '思维训练' })).toHaveTextContent('学完');
});

it('greys out an unavailable book, whose problems cannot be opened', () => {
  show([book({ status: 'unavailable' })]);
  const group = screen.getByRole('region', { name: '思维训练' });
  expect(group).toHaveTextContent('暂时不可用');
  expect(within(group).queryByRole('link')).toBeNull();
  expect(group).toHaveTextContent('第一道');
});
