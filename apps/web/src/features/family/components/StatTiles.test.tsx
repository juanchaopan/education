import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StatTiles } from './StatTiles';

it('names each count by its label, in the order given', () => {
  render(
    <StatTiles
      size="large"
      tiles={[
        ['道题', '5+'],
        ['次独立完成', '3+'],
      ]}
    />,
  );
  expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
    '道题',
    '次独立完成',
  ]);
  expect(screen.getAllByRole('definition').map((count) => count.textContent)).toEqual(['5+', '3+']);
});
