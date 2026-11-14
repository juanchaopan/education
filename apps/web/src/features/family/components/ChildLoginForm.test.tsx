import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ChildLoginForm } from './ChildLoginForm';

it('supports password managers, remembered locators and gentle errors without displaying the PIN', async () => {
  const onSubmit = vi.fn(),
    onChange = vi.fn();
  render(
    <ChildLoginForm
      familyCode="ABCD-EFGH-JKMN"
      nickname="小鹿"
      pin="018274"
      remember
      pending={false}
      error="请检查后再试一次。"
      onChange={onChange}
      onRemember={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
  expect(screen.getByLabelText('我的家庭码')).toHaveValue('ABCD-EFGH-JKMN');
  expect(screen.getByLabelText('我的家庭码')).toHaveAccessibleDescription('家长空间里随时可查看。');
  expect(screen.getByLabelText('我的昵称')).toHaveAttribute('autocomplete', 'username');
  expect(screen.getByLabelText('我的六位 PIN')).toHaveAttribute('type', 'password');
  expect(screen.getByLabelText('我的六位 PIN')).toHaveAttribute('autocomplete', 'current-password');
  expect(screen.getByRole('alert')).toHaveTextContent('请检查后再试一次。');
  await userEvent.click(screen.getByRole('button', { name: '进入我的空间' }));
  expect(onSubmit).toHaveBeenCalledOnce();
});

it('reports each change and the remember switch, and waits while signing in', async () => {
  const onChange = vi.fn(),
    onRemember = vi.fn();
  const { rerender } = render(
    <ChildLoginForm
      familyCode=""
      nickname=""
      pin=""
      remember
      onChange={onChange}
      onRemember={onRemember}
      onSubmit={vi.fn()}
    />,
  );
  await userEvent.type(screen.getByLabelText('我的昵称'), '鹿');
  expect(onChange).toHaveBeenCalledWith('nickname', '鹿');
  await userEvent.click(screen.getByRole('switch', { name: '在这台设备上记住家庭码和昵称' }));
  expect(onRemember).toHaveBeenCalledWith(false);
  rerender(
    <ChildLoginForm
      familyCode=""
      nickname=""
      pin=""
      remember
      pending
      onChange={onChange}
      onRemember={onRemember}
      onSubmit={vi.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: '正在打开你的空间…' })).toBeDisabled();
});
