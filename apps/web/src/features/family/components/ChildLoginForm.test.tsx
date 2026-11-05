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
  expect(screen.getByLabelText('我的昵称')).toHaveAttribute('autocomplete', 'username');
  expect(screen.getByLabelText('我的六位 PIN')).toHaveAttribute('type', 'password');
  expect(screen.getByLabelText('我的六位 PIN')).toHaveAttribute('autocomplete', 'current-password');
  expect(screen.getByRole('alert')).toHaveTextContent('请检查后再试一次。');
  await userEvent.click(screen.getByRole('button', { name: '进入我的空间' }));
  expect(onSubmit).toHaveBeenCalledOnce();
});
