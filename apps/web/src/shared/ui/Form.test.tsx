import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Form } from './Form';

it('hands a submit to the page without leaving it', async () => {
  const submit = vi.fn();
  render(
    <Form onSubmit={submit} aria-label="家长登录">
      <button type="submit">登录</button>
    </Form>,
  );
  const form = screen.getByRole('form', { name: '家长登录' });
  const event = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(submit).toHaveBeenCalledTimes(2);
});
