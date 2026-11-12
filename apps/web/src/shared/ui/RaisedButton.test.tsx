import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RaisedButton } from './RaisedButton';

it('reports a press, never submits a form and ignores a press while it cannot be pressed', () => {
  const press = vi.fn();
  const submit = vi.fn((event: Event) => event.preventDefault());
  const { rerender } = render(
    <form onSubmit={(event) => submit(event.nativeEvent)}>
      <RaisedButton onClick={press}>加载更多</RaisedButton>
    </form>,
  );
  fireEvent.click(screen.getByRole('button', { name: '加载更多' }));
  expect(press).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
  rerender(
    <form>
      <RaisedButton onClick={press} disabled>
        加载更多
      </RaisedButton>
    </form>,
  );
  fireEvent.click(screen.getByRole('button', { name: '加载更多' }));
  expect(press).toHaveBeenCalledOnce();
});

it('gives the chosen one and a whole row their own look, keeping the caller class', () => {
  render(
    <>
      <RaisedButton chosen className="placed">
        全部
      </RaisedButton>
      <RaisedButton shape="block">全部 10 道</RaisedButton>
    </>,
  );
  const chosen = screen.getByRole('button', { name: '全部' });
  const row = screen.getByRole('button', { name: '全部 10 道' });
  expect(chosen.className).toMatch(/chosen/);
  expect(chosen).toHaveClass('placed');
  expect(row.className).toMatch(/block/);
  expect(row.className).not.toMatch(/chosen/);
});
