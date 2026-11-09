import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Button } from './Button';

it('submits a form only when it is the action of that form', async () => {
  const submit = vi.fn();
  render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Button>取消</Button>
      <Button type="submit">登录</Button>
    </form>,
  );
  await userEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(submit).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(submit).toHaveBeenCalledOnce();
});

it('reports a press and ignores one while disabled', () => {
  const press = vi.fn();
  const { rerender } = render(<Button onClick={press}>复制家庭码</Button>);
  fireEvent.click(screen.getByRole('button', { name: '复制家庭码' }));
  expect(press).toHaveBeenCalledOnce();
  rerender(
    <Button onClick={press} disabled>
      复制家庭码
    </Button>,
  );
  fireEvent.click(screen.getByRole('button', { name: '复制家庭码' }));
  expect(press).toHaveBeenCalledOnce();
});

it('gives each variant and weight its own look and keeps the caller placement class', () => {
  render(
    <>
      <Button>主要</Button>
      <Button variant="secondary">次要</Button>
      <Button variant="text">文字</Button>
      <Button variant="danger">删除</Button>
      <Button weight="regular" className="placed">
        常规
      </Button>
    </>,
  );
  const classes = ['主要', '次要', '文字', '删除', '常规'].map(
    (name) => screen.getByRole('button', { name }).className,
  );
  expect(new Set(classes).size).toBe(5);
  expect(classes[4]).toContain('placed');
});
