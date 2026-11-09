import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TextField } from './TextField';

it('names the input by its label and reports what is typed', () => {
  const change = vi.fn();
  render(
    <TextField
      id="nickname"
      label="我的昵称"
      value=""
      onChange={(event) => change(event.target.value)}
    />,
  );
  const input = screen.getByRole('textbox', { name: '我的昵称' });
  expect(input).not.toHaveAttribute('aria-describedby');
  fireEvent.change(input, { target: { value: '小鹿' } });
  expect(change).toHaveBeenCalledWith('小鹿');
});

it('reads the hint out with the input', () => {
  render(<TextField id="nickname" label="我的昵称" hint="不用真名" />);
  expect(screen.getByRole('textbox', { name: '我的昵称' })).toHaveAccessibleDescription('不用真名');
});

it('draws an icon at the start that screen readers skip', () => {
  const { container } = render(<TextField id="email" label="登录邮箱" icon="mail" />);
  const input = screen.getByRole('textbox', { name: '登录邮箱' });
  expect(input.previousElementSibling).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelectorAll('svg')).toHaveLength(1);
});

it('passes the input settings through', () => {
  render(
    <TextField id="pin" label="我的六位 PIN" type="password" maxLength={6} required disabled />,
  );
  const input = screen.getByLabelText('我的六位 PIN');
  expect(input).toHaveAttribute('type', 'password');
  expect(input).toHaveAttribute('maxlength', '6');
  expect(input).toBeRequired();
  expect(input).toBeDisabled();
});
