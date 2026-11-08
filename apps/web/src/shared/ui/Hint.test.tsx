import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Hint } from './Hint';

it('shows its detail as a paragraph that a field can point at', () => {
  render(<Hint id="key-help">KEY 24 小时内有效</Hint>);
  const hint = screen.getByText('KEY 24 小时内有效');
  expect(hint.tagName).toBe('P');
  expect(hint).toHaveAttribute('id', 'key-help');
});
