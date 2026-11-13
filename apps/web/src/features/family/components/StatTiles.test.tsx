import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StatTiles } from './StatTiles';

it('names each count by its label, in the order given', () => {
  render(
    <StatTiles
      tiles={[
        ['独立完成', '0 次'],
        ['提示后完成', '1 次'],
      ]}
    />,
  );
  expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
    '独立完成',
    '提示后完成',
  ]);
  expect(screen.getAllByRole('definition').map((count) => count.textContent)).toEqual([
    '0 次',
    '1 次',
  ]);
});
