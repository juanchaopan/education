import { expect, it } from 'vitest';
import { addUpDays, bestStates, betterState, type StudyDay } from './family-overview.js';

const day = (date: string, seconds: number, ids: StudyDay['ids']): StudyDay => ({
  date,
  seconds,
  problems: { independent: 0, assisted: 0, open: 0 },
  ids,
});

it('ranks finishing alone above finishing after help above not finishing', () => {
  expect(betterState('open', 'assisted')).toBe('assisted');
  expect(betterState('independent', 'assisted')).toBe('independent');
  expect(betterState('open', 'open')).toBe('open');
});

it("keeps each problem's best state over several days", () => {
  const states = bestStates([
    ['garden', 'open'],
    ['garden', 'independent'],
    ['pattern', 'assisted'],
    ['pattern', 'open'],
  ]);
  expect(Object.fromEntries(states)).toEqual({ garden: 'independent', pattern: 'assisted' });
});

it('adds up the minutes of several days but counts a problem tried on two of them once', () => {
  expect(
    addUpDays([
      day('2026-11-11', 300, [['garden', 'open']]),
      day('2026-11-12', 420, [
        ['garden', 'independent'],
        ['trains', 'open'],
      ]),
      day('2026-11-13', 0, []),
    ]),
  ).toEqual({ seconds: 720, problems: { independent: 1, assisted: 0, open: 1 } });
});
