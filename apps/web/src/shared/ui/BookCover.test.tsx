import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookCover } from './BookCover';

vi.mock('../media/covers/covers', () => ({
  coverImage: (cover: string | null) =>
    cover === 'abacus-sprout' ? '/assets/abacus-sprout.webp' : undefined,
}));

describe('a book cover', () => {
  it("draws a book without a picture in its subject's colours, with its grade", () => {
    const { container } = render(<BookCover subject="语文" grade="二年级" cover={null} />);
    expect(container.querySelector('[data-tone="chinese"]')).not.toBeNull();
    expect(container).toHaveTextContent('二年级');
    expect(container.querySelector('img')).toBeNull();
  });

  it('draws a subject it does not know as a closed book on wheat', () => {
    const { container } = render(<BookCover subject="科学" grade="一年级" cover="missing" />);
    expect(container.querySelector('[data-tone="other"]')).not.toBeNull();
  });

  it('shows a painted cover as decoration, downloaded only when seen', () => {
    const { container } = render(<BookCover subject="数学" grade="一年级" cover="abacus-sprout" />);
    const picture = container.querySelector('img');
    expect(picture).toHaveAttribute('src', '/assets/abacus-sprout.webp');
    expect(picture).toHaveAttribute('alt', '');
    expect(picture).toHaveAttribute('loading', 'lazy');
  });

  it('crosses an unavailable card cover with a band, but not a thumbnail', () => {
    const card = render(<BookCover subject="数学" grade="一年级" cover={null} unavailable />);
    expect(card.container).toHaveTextContent('暂时不可用');
    const thumb = render(
      <BookCover subject="数学" grade="一年级" cover={null} size="thumb" unavailable />,
    );
    expect(thumb.container).not.toHaveTextContent('暂时不可用');
    expect(thumb.container).not.toHaveTextContent('一年级');
  });

  it('stands a small book with its page edges, greyed but without a band when unavailable', () => {
    const { container } = render(
      <BookCover subject="数学" grade="一年级" cover={null} size="standing" unavailable />,
    );
    expect(container.querySelector('[data-size="standing"]')).toHaveAttribute('data-unavailable');
    expect(container).not.toHaveTextContent('暂时不可用');
    expect(container).not.toHaveTextContent('一年级');
  });

  it('lays marks in the corner asked for', () => {
    const { container } = render(
      <BookCover subject="数学" grade="一年级" cover={null} marks="5/12" corner="bottom" />,
    );
    expect(container.querySelector('[data-corner="bottom"]')).toHaveTextContent('5/12');
  });
});
