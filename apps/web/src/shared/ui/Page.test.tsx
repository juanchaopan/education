import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Page } from './Page';

it('is a region named by its one main title', () => {
  render(
    <Page titleId="family-title" title="家长空间">
      <p>内容</p>
    </Page>,
  );
  expect(screen.getByRole('heading', { level: 1, name: '家长空间' })).toHaveAttribute(
    'id',
    'family-title',
  );
  expect(screen.getByRole('region', { name: '家长空间' })).toHaveTextContent('内容');
});
