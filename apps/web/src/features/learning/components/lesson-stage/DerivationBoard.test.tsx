import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DerivationBoard } from './DerivationBoard';

function board(props: Partial<Parameters<typeof DerivationBoard>[0]> = {}) {
  render(
    <svg>
      <DerivationBoard x={0} y={0} width={400} now={['|10 − t| = 4']} {...props} />
    </svg>,
  );
  return screen.getByRole('group', { name: '推导' });
}

it('reads the step it grew from, the current step and its reading, in order', () => {
  const steps = board({
    before: '距离 = |10 − t|',
    now: ['|10 − t| = 4'],
    note: '左边是距离，右边是题目要的四格',
  });
  expect(steps).toHaveTextContent('距离 = |10 − t||10 − t| = 4左边是距离，右边是题目要的四格');
});

it('writes a line for each case of the current step, the one pointed at in gold', () => {
  const steps = board({ now: ['10 − t = 4', '10 − t = −4'], lit: 1 });
  const lines = [...steps.querySelectorAll('text')];
  expect(lines.map((line) => line.textContent)).toEqual(['10 − t = 4', '10 − t = −4']);
  expect(lines[1]!.getAttribute('class')).not.toBe(lines[0]!.getAttribute('class'));
});

it('grows taller with every line it holds', () => {
  const height = () => Number(document.querySelector('rect')!.getAttribute('height'));
  const { unmount } = render(
    <svg>
      <DerivationBoard x={0} y={0} width={400} now={['t = 6']} />
    </svg>,
  );
  const one = height();
  unmount();
  board({ before: '10 − t = 4', now: ['t = 6', 't = 14'], note: '两个时刻' });
  expect(height()).toBeGreaterThan(one);
});
