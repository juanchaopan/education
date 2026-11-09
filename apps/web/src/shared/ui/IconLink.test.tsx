import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { IconLink } from './IconLink';

it('is a link named by its label', () => {
  render(
    <MemoryRouter>
      <IconLink to="/family/practice" icon="plus" label="安排练习" />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: '安排练习' })).toHaveAttribute(
    'href',
    '/family/practice',
  );
});
