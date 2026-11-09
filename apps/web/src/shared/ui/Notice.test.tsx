import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Notice } from './Notice';

it('interrupts with an error and announces anything else in turn', () => {
  render(
    <>
      <Notice tone="error">没能登录</Notice>
      <Notice tone="success">已复制</Notice>
      <Notice>正在受理</Notice>
    </>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('没能登录');
  expect(screen.getAllByRole('status').map((notice) => notice.textContent)).toEqual([
    '已复制',
    '正在受理',
  ]);
});

it('stays quiet when it is part of the page from the start', () => {
  render(<Notice live={false}>记住自己的 PIN</Notice>);
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByText('记住自己的 PIN').closest('p')).toHaveAttribute('data-tone', 'info');
});

it('holds several paragraphs as a block', () => {
  render(
    <Notice tone="success" as="div">
      <p>已受理</p>
      <p>请查收邮件</p>
    </Notice>,
  );
  const notice = screen.getByRole('status');
  expect(notice.tagName).toBe('DIV');
  expect(notice).toHaveTextContent('已受理请查收邮件');
});

it('marks each tone with its own icon, hidden from screen readers', () => {
  render(
    <>
      <Notice tone="error">没能登录</Notice>
      <Notice tone="success">已复制</Notice>
    </>,
  );
  const drawings = [screen.getByRole('alert'), screen.getByRole('status')].map(
    (notice) => notice.querySelector('[aria-hidden="true"] svg')?.innerHTML,
  );
  expect(drawings[0]).toBeTruthy();
  expect(drawings[0]).not.toBe(drawings[1]);
});
