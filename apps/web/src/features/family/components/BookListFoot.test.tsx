import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookListFoot } from './BookListFoot';

afterEach(() => vi.unstubAllGlobals());

type Report = (entries: { isIntersecting: boolean }[]) => void;

// An observer that reports the foot in view as soon as it is watched.
function stubObserver() {
  const watched: Element[] = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly report: Report;
      constructor(report: Report) {
        this.report = report;
      }
      observe(target: Element) {
        watched.push(target);
        this.report([{ isIntersecting: true }]);
      }
      disconnect() {}
    },
  );
  return watched;
}

describe('with a mouse', () => {
  it('loads more when 加载更多 is pressed, and not by itself', async () => {
    const watched = stubObserver();
    const onMore = vi.fn();
    render(<BookListFoot state="more" touch={false} onMore={onMore} />);
    expect(watched).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: '加载更多' }));
    expect(onMore).toHaveBeenCalledOnce();
  });

  it('sinks the button flat while a batch loads', () => {
    render(<BookListFoot state="loading" touch={false} onMore={vi.fn()} />);
    expect(screen.getByRole('button', { name: '加载中…' })).toBeDisabled();
  });
});

describe('on a touch device', () => {
  it('loads more by itself near the bottom, without a button', () => {
    stubObserver();
    const onMore = vi.fn();
    render(<BookListFoot state="more" touch onMore={onMore} />);
    expect(onMore).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a placeholder book and hopping dots while a batch loads', () => {
    render(<BookListFoot state="loading" touch onMore={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('加载中…');
  });
});

it('says a batch did not load and tries again, on either device', async () => {
  for (const touch of [true, false]) {
    const onMore = vi.fn();
    const { unmount } = render(<BookListFoot state="failed" touch={touch} onMore={onMore} />);
    expect(screen.getByRole('alert')).toHaveTextContent('这一批没加载出来');
    await userEvent.click(screen.getByRole('button', { name: '再试一次' }));
    expect(onMore).toHaveBeenCalledOnce();
    unmount();
  }
});

it('says when every book is shown', () => {
  render(<BookListFoot state="done" touch={false} onMore={vi.fn()} />);
  expect(screen.getByText('都在这里了')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
