import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';

it('names the list by its label and reports the choice', async () => {
  const choose = vi.fn();
  render(
    <SelectField
      id="child"
      label="选择孩子"
      value=""
      onChange={(event) => choose(event.target.value)}
    >
      <option value="">请选择</option>
      <option value="deer">小鹿</option>
    </SelectField>,
  );
  await userEvent.selectOptions(screen.getByRole('combobox', { name: '选择孩子' }), '小鹿');
  expect(choose).toHaveBeenCalledWith('deer');
});
