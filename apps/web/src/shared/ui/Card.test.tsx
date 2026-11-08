import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Card } from './Card';

it('is a region named by its heading', () => {
  render(
    <Card aria-labelledby="code-title">
      <h2 id="code-title">我的家庭码</h2>
    </Card>,
  );
  expect(screen.getByRole('region', { name: '我的家庭码' })).toBeInTheDocument();
});

it('lies flat or raised and keeps the caller placement class', () => {
  render(
    <>
      <Card aria-label="raised" className="placed" />
      <Card aria-label="flat" flat />
    </>,
  );
  const raised = screen.getByRole('region', { name: 'raised' });
  const flat = screen.getByRole('region', { name: 'flat' });
  expect(raised.className).toContain('placed');
  expect(raised.className).not.toBe(flat.className);
});
