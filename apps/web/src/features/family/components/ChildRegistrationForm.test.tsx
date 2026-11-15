import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  ChildRegistrationForm,
  type ChildRegistrationFields,
  type ChildRegistrationFormProps,
} from './ChildRegistrationForm';

afterEach(cleanup);

// The form as a page holds it: each change written back into the fields.
function Holder(props: Partial<ChildRegistrationFormProps>) {
  const [fields, setFields] = useState<ChildRegistrationFields>({
    registrationKey: '',
    nickname: '',
    pin: '',
  });
  return (
    <ChildRegistrationForm
      {...fields}
      onChange={(field, value) => setFields((current) => ({ ...current, [field]: value }))}
      onSubmit={() => {}}
      {...props}
    />
  );
}

it('groups the KEY in fours as it is typed or pasted', async () => {
  render(<Holder />);
  const key = screen.getByLabelText('家长给我的 KEY');
  await userEvent.type(key, 'abcde');
  expect(key).toHaveValue('ABCD-E');
  await userEvent.clear(key);
  await userEvent.click(key);
  await userEvent.paste('abcd efgh jkmn pqrs');
  expect(key).toHaveValue('ABCD-EFGH-JKMN-PQRS');
});

it('counts the nickname up to twelve and says how far past it a longer one goes', async () => {
  render(<Holder />);
  const nickname = screen.getByLabelText('我的昵称');
  expect(nickname).toHaveAccessibleDescription('不用真名 · 0 / 12');
  await userEvent.type(nickname, '小'.repeat(12));
  expect(nickname).toHaveAccessibleDescription('不用真名 · 12 / 12');
  await userEvent.type(nickname, '明');
  expect(nickname).toHaveAccessibleDescription('不用真名 · 多了 1 个字');
});

it('keeps the PIN for the parent alone and shows the rules only once an answer breaks them', () => {
  render(<Holder />);
  expect(screen.getByLabelText('设置六位数字 PIN')).toHaveAccessibleDescription('只告诉家长');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  cleanup();
  render(<Holder error="试试不全相同、也不连续的六位数字，会更安全。" />);
  expect(screen.getByRole('alert')).toHaveTextContent('不全相同、也不连续');
});

it('sends the form and holds every field while it is sent', async () => {
  const submit = vi.fn();
  render(<Holder onSubmit={submit} />);
  await userEvent.type(screen.getByLabelText('家长给我的 KEY'), 'ABCDEFGHJKMNPQRS');
  await userEvent.type(screen.getByLabelText('我的昵称'), '小明');
  await userEvent.type(screen.getByLabelText('设置六位数字 PIN'), '018274');
  await userEvent.click(screen.getByRole('button', { name: '加入家庭' }));
  expect(submit).toHaveBeenCalledOnce();
  cleanup();
  render(<Holder pending />);
  expect(screen.getByRole('button', { name: '正在加入，请稍等…' })).toBeDisabled();
  expect(screen.getByLabelText('我的昵称')).toBeDisabled();
});
