import { expect, it } from 'vitest';
import { arrive, opening, pebblesIn, respond, savesProgress } from './story';
import { shots } from './script';

const bowl = { kind: 'drop', place: 'bowl' } as const;

it('moves on to the count once both pebbles are in the bowl', () => {
  const first = respond(arrive('look').state, bowl);
  expect(first).toMatchObject({ state: { shot: 'look', inBowl: 1 }, say: [] });
  expect(respond(first!.state, bowl)).toMatchObject({ state: { shot: 'count', inBowl: 2 } });
});

it('ignores a drop where nothing is put in, and resumes a saved scene with its pebbles', () => {
  expect(respond(arrive('count').state, bowl)).toBeUndefined();
  expect(respond(arrive('guess').state, bowl)).toBeUndefined();
  expect(respond(opening, bowl)).toBeUndefined();
  expect(arrive('count')).toEqual({ state: { shot: 'count', inBowl: 2 }, say: ['ask'], chime: [] });
});

it('puts three pebbles in during the variation, then asks why', () => {
  expect(arrive('guess')).toMatchObject({ state: { inBowl: 0 }, say: ['three'] });
  expect(pebblesIn('place')).toBe(3);
  const two = respond(respond(arrive('place').state, bowl)!.state, bowl);
  expect(two).toMatchObject({ state: { shot: 'place', inBowl: 2 }, say: [] });
  expect(respond(two!.state, bowl)).toMatchObject({
    state: { shot: 'reason', inBowl: 3 },
    say: ['why'],
  });
  expect(arrive('reveal')).toMatchObject({ state: { inBowl: 3 }, say: ['reveal'] });
});

it('saves the scenes up to the count only', () => {
  expect(shots.filter(savesProgress)).toEqual(['look', 'count']);
});
