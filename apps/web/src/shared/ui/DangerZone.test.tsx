import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DangerZone } from './DangerZone';

it('holds the last step without changing what it holds', () => {
  render(
    <DangerZone>
      <button type="button">永久删除家庭</button>
    </DangerZone>,
  );
  const button = screen.getByRole('button', { name: '永久删除家庭' });
  expect(button.parentElement?.tagName).toBe('DIV');
  expect(button.parentElement?.className).toBeTruthy();
});
