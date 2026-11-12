import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { LessonBoard } from '../lessons/lesson-board';
import { KeptConclusions } from './KeptConclusions';

type Shot = 'look' | 'count' | 'after';
type State = Readonly<{ shot: Shot | 'opening' }>;

const board: LessonBoard<State, Shot, 'pebble'> = {
  pictures: { pebble: <circle cx="50%" cy="50%" r="40%" /> },
  conclusions: [
    {
      id: 'one-pebble',
      says: '桌上有 1 颗小石子',
      amounts: [[1, 'pebble']],
      from: 'count',
      uses: ['count'],
      answer: { amount: [1, 'pebble'], says: '桌上一共 1 颗小石子' },
    },
  ],
};
const lesson = {
  script: { shots: ['look', 'count', 'after'] },
  answer: { shot: 'count' },
  board,
} as const;

function keep(shot: State['shot'], answered = false) {
  render(<KeptConclusions lesson={lesson} state={{ shot }} progress={{ answered }} />);
  return within(screen.getByRole('list', { name: '记住的结论' }));
}

it('lays the board into the picture with nothing on it before a scene finds a conclusion', () => {
  const kept = keep('look');
  expect(kept.queryAllByRole('listitem')).toEqual([]);
});

it('shows a conclusion found, marked current while the scene on screen uses it', () => {
  const kept = keep('count');
  expect(kept.getAllByRole('listitem')).toHaveLength(1);
  expect(kept.getByText('桌上有 1 颗小石子').parentElement).toHaveAttribute('aria-current', 'true');
});

it('writes the count on once the child has answered it right', () => {
  const kept = keep('count', true);
  expect(kept.getByRole('listitem')).toHaveTextContent('桌上一共 1 颗小石子');
});

it('shows no board for a lesson that keeps none', () => {
  render(
    <KeptConclusions
      lesson={{ ...lesson, board: undefined }}
      state={{ shot: 'count' }}
      progress={{ answered: false }}
    />,
  );
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});
