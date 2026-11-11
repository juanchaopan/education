import { expect, it } from 'vitest';
import { arrive, opening, respond } from './story';

const bowl = { kind: 'drop', place: 'bowl' } as const;

it('moves on to the count once both pebbles are in the bowl', () => {
  const first = respond(arrive('look').state, bowl);
  expect(first).toMatchObject({ state: { shot: 'look', inBowl: 1 }, say: [] });
  expect(respond(first!.state, bowl)).toMatchObject({ state: { shot: 'count', inBowl: 2 } });
});

it('ignores a drop outside the first scene, and resumes a saved scene with its pebbles', () => {
  expect(respond(arrive('count').state, bowl)).toBeUndefined();
  expect(respond(opening, bowl)).toBeUndefined();
  expect(arrive('after')).toEqual({ state: { shot: 'after', inBowl: 2 }, say: ['bye'], chime: [] });
});
