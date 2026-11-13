import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { LinkButton } from './LinkButton';

it('stays a link to where it leads', () => {
  render(
    <MemoryRouter>
      <LinkButton to="/family/profile#invite">邀请孩子</LinkButton>
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: '邀请孩子' })).toHaveAttribute(
    'href',
    '/family/profile#invite',
  );
});
