import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { BookCard, BookCardPlaceholder, type CardBook } from './BookCard';

const book: CardBook = {
  name: '学而思',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: 12,
};

it('names the book with its grade, subject and number of problems, and its action', () => {
  render(<BookCard book={book} action={<button type="button">安排</button>} note="没安排上" />);
  const card = screen.getByRole('article');
  expect(screen.getByRole('heading', { name: '学而思' })).toBeInTheDocument();
  expect(card).toHaveTextContent('一年级 · 数学 · 12 题');
  expect(screen.getByRole('button', { name: '安排' })).toBeInTheDocument();
  expect(card).toHaveTextContent('没安排上');
  expect(card).not.toHaveAttribute('data-unavailable');
});

it('greys out a book that is unavailable', () => {
  render(<BookCard book={{ ...book, status: 'unavailable' }} />);
  expect(screen.getByRole('article')).toHaveAttribute('data-unavailable');
  expect(screen.getByRole('article')).toHaveTextContent('暂时不可用');
});

it('holds the place of a book still on its way, hidden from screen readers', () => {
  const { container } = render(<BookCardPlaceholder />);
  expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
});
