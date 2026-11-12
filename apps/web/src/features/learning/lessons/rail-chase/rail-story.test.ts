import { describe, expect, it } from 'vitest';
import { railProps } from './rail-look';
import {
  arrive,
  opening,
  respond,
  runs,
  savesProgress,
  type Move,
  type RailState,
} from './rail-story';
import { unit } from './rail-track';
import { shots, type Shot } from './script';

const at = (shot: Shot) => arrive(shot).state;
const drive = (to: number): Move => ({ kind: 'drive', to });
const tap = (part: Extract<Move, { kind: 'tap' }>['part']): Move => ({ kind: 'tap', part });

// Makes the moves one after another, as long as each is taken.
function play(state: RailState, ...moves: Move[]) {
  return moves.reduce((now, move) => respond(now, move)?.state ?? now, state);
}

describe('arriving at a scene', () => {
  it('opens every scene with the line that says where the child is', () => {
    for (const shot of shots) expect(arrive(shot).say.length).toBeGreaterThan(0);
  });

  it('puts the cars where the scene begins, which is also where a saved lesson resumes', () => {
    expect(at('one-second').t).toBe(0);
    expect(at('catch-up').t).toBe(3);
    expect(at('equation').t).toBe(12);
    expect(at('check-six').t).toBe(0);
    expect(at('vary-seven').t).toBe(3);
  });

  it('plays on from the opening story by itself', () => {
    expect(arrive('story').then).toBe('speed');
    expect(arrive('speed').then).toBeUndefined();
  });
});

describe('pushing the cars', () => {
  it('halts at the stop however far the car is pushed, then says the stop and plays on', () => {
    const reaction = respond(at('catch-up'), drive(25));
    expect(reaction?.state).toMatchObject({ t: 10, stopped: true });
    expect(reaction?.say).toEqual(['catchMeet', 'catchAhead']);
    expect(reaction?.then).toBe('past');
  });

  it('moves freely between the scene’s start and its stop, saying nothing', () => {
    const reaction = respond(at('catch-up'), drive(6.04));
    expect(reaction?.state).toMatchObject({ t: 6, stopped: false });
    expect(reaction?.say).toEqual([]);
  });

  it('never stops at either time of the answer before it is asked', () => {
    const asked = shots.indexOf('solve');
    for (const [shot, run] of Object.entries(runs))
      if (shots.indexOf(shot as Shot) < asked) expect([6, 14]).not.toContain(run.stop);
  });

  it('goes back no further than where the scene began', () => {
    const state = play(at('catch-up'), drive(7));
    expect(respond(state, drive(1))?.state.t).toBe(3);
    expect(respond(at('catch-up'), drive(1))).toBeUndefined();
  });

  it('takes no push once the cars wait at the stop for its lines', () => {
    const stopped = play(at('two-seconds'), drive(2));
    expect(stopped.stopped).toBe(true);
    expect(respond(stopped, drive(1))).toBeUndefined();
    expect(respond(stopped, { kind: 'nudge', nudge: -1 })).toBeUndefined();
  });

  it('drives a second on for a tap on a car or the right arrow key, and back for the left', () => {
    const one = play(at('catch-up'), tap('yellow-car'));
    expect(one.t).toBe(4);
    expect(play(one, { kind: 'nudge', nudge: 1 }).t).toBe(5);
    expect(play(one, { kind: 'nudge', nudge: -1 }).t).toBe(3);
  });

  it('cannot move the cars in a scene they are not pushed through', () => {
    expect(respond(at('equation'), drive(14))).toBeUndefined();
    expect(respond(at('solve'), tap('yellow-car'))).toBeUndefined();
  });

  it('turns a drag of either car into the seconds that car takes to cover it', () => {
    const held = at('catch-up');
    expect(railProps.slides?.['yellow-car']?.drag(4 * unit, held)).toEqual(drive(5));
    expect(railProps.slides?.['blue-car']?.drag(4 * unit, held)).toEqual(drive(7));
    expect(railProps.slides?.['yellow-car']?.drag(3 * unit, at('vary'))).toEqual(drive(1));
  });
});

describe('tapping', () => {
  it('takes the scene’s taps in their order only, and plays on after the last', () => {
    const speed = at('speed');
    expect(respond(speed, tap('blue-car'))).toBeUndefined();
    const yellow = respond(speed, tap('yellow-car'));
    expect(yellow?.say).toEqual(['speedYellow']);
    const blue = respond(yellow!.state, tap('blue-car'));
    expect(blue?.say).toEqual(['speedBlue', 'speedBoth']);
    expect(blue?.then).toBe('question');
  });

  it('lets the child look at the squares after the cars passed only once they stop', () => {
    const past = at('past');
    expect(respond(past, tap('gap'))).toBeUndefined();
    const stopped = play(past, drive(11));
    const looked = respond(stopped, tap('gap'));
    expect(looked?.say).toEqual(['pastWhy', 'pastSign']);
    expect(looked?.then).toBe('distance');
  });

  it('splits the equation into the blue car ahead, then the yellow car ahead', () => {
    const ways = at('two-ways');
    expect(respond(ways, tap('yellow-ahead'))).toBeUndefined();
    const both = play(ways, tap('blue-ahead'), tap('yellow-ahead'));
    expect(both.taps).toBe(2);
    expect(respond(play(ways, tap('blue-ahead')), tap('yellow-ahead'))?.then).toBe('solve');
  });

  it('flashes a car’s headlight in the opening story without moving it', () => {
    const flashed = respond(at('story'), tap('blue-car'));
    expect(flashed?.state).toMatchObject({ t: 0, taps: 1 });
    expect(flashed?.say).toEqual([]);
  });

  it('ignores every move on the title card', () => {
    expect(respond(opening, tap('yellow-car'))).toBeUndefined();
  });
});

describe('the variation', () => {
  it('stops at the faster yellow car’s two times, saying only 停 at the first', () => {
    const first = respond(at('vary'), drive(9));
    expect(first?.state.t).toBe(3);
    expect(first?.say).toEqual(['varyStop']);
    const second = respond(at('vary-seven'), drive(9));
    expect(second?.state.t).toBe(7);
    expect(second?.say).toEqual(['varyStopAgain', 'varyWhy', 'varyReveal']);
    expect(second?.then).toBeUndefined();
  });
});

it('saves the scenes up to the answer, and not the checks and variation after it', () => {
  expect(shots.filter(savesProgress)).toEqual(shots.slice(0, shots.indexOf('solve') + 1));
  expect(savesProgress('opening')).toBe(false);
});
