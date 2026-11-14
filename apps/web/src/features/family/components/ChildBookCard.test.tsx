import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { ChildBook } from '@education/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ChildBookCard } from './ChildBookCard';
import { childBook, fixtureNow } from './child-book-fixtures';

function Shelf({ book, onToggle }: { book: ChildBook; onToggle?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <ChildBookCard
        book={book}
        open={open}
        now={fixtureNow}
        onToggle={() => {
          onToggle?.();
          setOpen(!open);
        }}
      />
    </MemoryRouter>
  );
}

const card = () => screen.getByRole('article');
// The card's one button: the row that opens the book, or closes it.
const toggle = () => screen.getByRole('button');

describe('a closed book', () => {
  it('shows the book, its progress and how many problems it holds, but none of them', () => {
    render(<Shelf book={childBook()} />);
    expect(screen.getByRole('heading', { name: '学而思' })).toBeInTheDocument();
    expect(screen.getByText('一年级 · 数学 · 昨天学过')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '学而思，2 / 5，全部 5 道', expanded: false }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('opens wherever on the card it is pressed', async () => {
    const onToggle = vi.fn();
    render(<Shelf book={childBook()} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('heading', { name: '学而思' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '收起学而思', expanded: true })).toBeInTheDocument();
  });

  it('tells a new book apart and says when it was given', () => {
    const given = fixtureNow.toISOString();
    render(
      <Shelf book={childBook({ fresh: true, done: 0, studiedAt: null, assignedAt: given })} />,
    );
    expect(screen.getByText('一年级 · 数学 · 刚刚安排')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^学而思，新书，0 \/ 5/ })).toBeInTheDocument();
  });
});

describe('an open book', () => {
  it('lists every problem as a link, the done ones ticked, and closes only from its last row', async () => {
    const onToggle = vi.fn();
    render(<Shelf book={childBook()} onToggle={onToggle} />);
    await userEvent.click(toggle());
    const links = within(card()).getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', '/problems/fixture-problem-1/1');
    expect(links[0]).toHaveTextContent('一棵青菜有多重做完了');
    expect(links[2]).not.toHaveTextContent('做完了');
    await userEvent.click(screen.getByRole('heading', { name: '学而思' }));
    expect(onToggle).toHaveBeenCalledOnce();
    const parts = card().querySelectorAll('ol, button');
    expect(parts[parts.length - 1]).toHaveTextContent('收起');
    await userEvent.click(screen.getByRole('button', { name: '收起学而思' }));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('moves to the first problem when opened by keyboard', async () => {
    render(<Shelf book={childBook()} />);
    toggle().focus();
    await userEvent.keyboard('{Enter}');
    expect(within(card()).getAllByRole('link')[0]).toHaveFocus();
  });
});

describe('an unavailable book', () => {
  it('opens to show its problems greyed, not as links, and closes like any other', async () => {
    render(<Shelf book={childBook({ status: 'unavailable', name: '儿歌和童谣' })} />);
    await userEvent.click(
      screen.getByRole('button', { name: '儿歌和童谣，暂时不可用，全部 5 道' }),
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const rows = within(card()).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    for (const row of rows) expect(row).toHaveTextContent('暂时不可用');
    const close = screen.getByRole('button', { name: '收起儿歌和童谣' });
    expect(close).toBeEnabled();
    await userEvent.click(close);
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });
});
