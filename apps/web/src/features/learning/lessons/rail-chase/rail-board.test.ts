import { expect, it } from 'vitest';
import { derivationOf } from './rail-board';
import { arrive, opening, respond, type Move, type RailState } from './rail-story';
import { railView } from './rail-view';
import { shots, type Shot } from './script';
import { positions, wonBack } from './rail-track';

const at = (shot: Shot) => arrive(shot).state;
const stopped = (shot: Shot): RailState => ({ ...at(shot), stopped: true });
const tapped = (shot: Shot, taps: number): RailState => ({ ...at(shot), taps });
const play = (state: RailState, ...moves: Move[]) =>
  moves.reduce((now, move) => respond(now, move)?.state ?? now, state);

// Every line the board shows in a state.
const written = (state: RailState) => {
  const board = derivationOf(state);
  return board ? [board.before, ...board.now, board.note].filter(Boolean).join(' ') : '';
};

it('writes nothing before the cars first move, and nothing on the title card', () => {
  for (const shot of ['story', 'speed', 'question', 'start-gap'] as const)
    expect(derivationOf(at(shot))).toBeUndefined();
  expect(derivationOf(at('one-second'))).toBeUndefined();
  expect(derivationOf(opening)).toBeUndefined();
});

it('grows the equation step by step, each step with the one before it above', () => {
  expect(derivationOf(stopped('past'))?.note).toBe('蓝车领先 −1 格：黄车反过来领先 1 格');
  expect(derivationOf(stopped('one-second'))?.now).toEqual(['每秒追回 2 − 1 = 1 格']);
  expect(derivationOf(tapped('name-t', 1))).toMatchObject({
    before: '走 3 秒，蓝车领先 10 − 3 = 7 格',
    now: ['蓝车领先 = 10 − t'],
  });
  expect(derivationOf(stopped('distance'))?.now).toEqual(['距离 = |10 − t|']);
  expect(derivationOf(tapped('equation', 1))).toMatchObject({
    before: '距离 = |10 − t|',
    now: ['|10 − t| = 4'],
  });
  expect(derivationOf(tapped('two-ways', 2))?.now).toEqual([
    '蓝车在前：10 − t = 4',
    '黄车在前：10 − t = −4',
  ]);
});

it('shows the two cases while the child answers, and never a time before the check', () => {
  const answerAt = shots.indexOf('solve');
  for (const shot of shots.slice(0, answerAt + 1))
    for (const state of [at(shot), stopped(shot), tapped(shot, 2)])
      expect(written(state)).not.toMatch(/t = 6|t = 14|6 秒|14 秒/);
  expect(derivationOf(at('solve'))?.now).toHaveLength(2);
});

it('writes each time once the cars stop at it in the check, and the variation’s at its reveal', () => {
  expect(derivationOf(stopped('check-six'))?.now).toEqual(['t = 6']);
  expect(derivationOf(stopped('check-fourteen'))?.now).toEqual(['t = 6 或 t = 14']);
  expect(written(at('vary'))).not.toMatch(/t = 3|t = 7/);
  expect(written(play(at('vary-seven'), { kind: 'drive', to: 7 }))).toMatch('t = 3 或 t = 7');
});

it('draws only what the scene is about', () => {
  expect(railView(at('story'))).toMatchObject({ question: false, strip: false, drops: false });
  expect(railView(tapped('question', 2))).toMatchObject({ question: true, sample: true });
  expect(railView(at('start-gap'))).toMatchObject({ strip: false, next: 'start-gap' });
  expect(railView(tapped('start-gap', 1))).toMatchObject({ strip: true, counting: true });
  expect(railView(stopped('one-second'))).toMatchObject({ compare: true, legend: 'plain' });
  expect(railView(at('vary'))).toMatchObject({ legend: 'supposed', speeds: true });
});

it('points at the next thing to touch, and at nothing while the cars wait at a stop', () => {
  expect(railView(at('speed')).next).toBe('yellow-car');
  expect(railView(tapped('speed', 1)).next).toBe('blue-car');
  expect(railView(at('catch-up')).next).toBe('yellow-car');
  expect(railView(stopped('catch-up')).next).toBeUndefined();
  expect(railView(stopped('past')).next).toBe('gap');
  expect(railView(at('equation')).next).toBe('four');
  expect(railView(tapped('two-ways', 1)).next).toBe('yellow-ahead');
  expect(railView(at('solve')).next).toBeUndefined();
});

it('marks the yellow car ahead once the cars have passed, and the ruler at each time', () => {
  expect(railView(tapped('past', 1)).ahead).toBe(true);
  expect(railView(at('past')).meet).toBe(true);
  expect(railView(stopped('check-six'))).toMatchObject({ ruler: true, ahead: false });
  expect(railView(stopped('check-fourteen'))).toMatchObject({ ruler: true, ahead: true });
});

it('puts the midpoints ten squares apart at the start and four apart at both times', () => {
  expect(positions(0, 'speed').gap).toBe(10);
  expect(positions(6, 'check-six').gap).toBe(4);
  expect(positions(14, 'check-fourteen').gap).toBe(-4);
  expect(Math.abs(positions(3, 'vary').gap)).toBe(4);
  expect(Math.abs(positions(7, 'vary-seven').gap)).toBe(4);
});

it('wins back a square a second, two in the variation, and never more than ten', () => {
  expect(wonBack(3, 'name-t')).toBe(3);
  expect(wonBack(12, 'equation')).toBe(10);
  expect(wonBack(2.5, 'vary')).toBe(5);
});
