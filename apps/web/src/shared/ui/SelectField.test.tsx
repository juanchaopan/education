import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';

const options = (
  <>
    <option value="">请选择</option>
    <option value="deer">小鹿</option>
  </>
);

it('names the list by its label and reports the choice', async () => {
  const choose = vi.fn();
  render(
    <SelectField
      id="child"
      label="选择孩子"
      value=""
      onChange={(event) => choose(event.target.value)}
    >
      {options}
    </SelectField>,
  );
  await userEvent.selectOptions(screen.getByRole('combobox', { name: '选择孩子' }), '小鹿');
  expect(choose).toHaveBeenCalledWith('deer');
});

it('gives an emphasised list its own look without changing its name', () => {
  render(
    <>
      <SelectField id="plain" label="选择孩子" defaultValue="">
        {options}
      </SelectField>
      <SelectField id="filter" label="年级" defaultValue="" emphasis>
        {options}
      </SelectField>
    </>,
  );
  const plain = screen.getByRole('combobox', { name: '选择孩子' });
  const filter = screen.getByRole('combobox', { name: '年级' });
  expect(filter.className).not.toBe(plain.className);
  expect(screen.getByText('年级').className).not.toBe(screen.getByText('选择孩子').className);
});
