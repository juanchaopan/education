import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Actions } from './Actions';

it('keeps its buttons in order', () => {
  render(
    <Actions>
      <button type="button">上一页</button>
      <button type="button">下一页</button>
    </Actions>,
  );
  expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
    '上一页',
    '下一页',
  ]);
});
