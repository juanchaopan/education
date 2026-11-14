import { recordActionsMax, recordCountMax, type ScenePicture } from '@education/contracts';
import { describe, expect, it } from 'vitest';
import { emptyLog, lessonRecord, logArrival, logMove } from './lesson-record';

const shots = ['look', 'count', 'after'];
const pebbles = (count: number): ScenePicture => ({
  things: [{ place: 'table', thing: 'pebble', count }],
  states: [],
});

const arriving = (shot: string, count: number, log = emptyLog) =>
  logArrival(log, shots, shot, pebbles(count));

describe('the lesson log', () => {
  it('starts with a blank picture and nothing seen', () => {
    expect(lessonRecord(emptyLog)).toEqual({
      now: { things: [], states: [] },
      ended: [],
      actions: [],
    });
  });

  it('ends the scene on screen with its last picture when the next scene comes', () => {
    let log = arriving('look', 2);
    log = logMove(log, 'tap', pebbles(1));
    log = arriving('count', 0, log);
    expect(lessonRecord(log)).toEqual({
      now: pebbles(0),
      ended: [{ stepId: 'look', picture: pebbles(1) }],
      actions: [{ stepId: 'look', action: 'tap', times: 1 }],
    });
  });

  it('keeps the picture when a move is no key action or leaves the scene', () => {
    let log = arriving('look', 2);
    log = logMove(log, undefined, undefined);
    expect(lessonRecord(log)).toEqual({ now: pebbles(2), ended: [], actions: [] });
  });

  it('counts the same action done again in a row, up to its limit', () => {
    let log = arriving('look', 2);
    for (let time = 0; time < recordCountMax + 2; time++) log = logMove(log, 'tap', undefined);
    log = logMove(log, 'drag', undefined);
    log = logMove(log, 'tap', undefined);
    expect(lessonRecord(log).actions).toEqual([
      { stepId: 'look', action: 'tap', times: recordCountMax },
      { stepId: 'look', action: 'drag', times: 1 },
      { stepId: 'look', action: 'tap', times: 1 },
    ]);
  });

  it('keeps only the latest actions', () => {
    let log = arriving('look', 2);
    for (let time = 0; time < recordActionsMax + 1; time++)
      log = logMove(log, time % 2 ? 'tap' : 'drag', undefined);
    const { actions } = lessonRecord(log);
    expect(actions).toHaveLength(recordActionsMax);
    expect(actions[0]).toEqual({ stepId: 'look', action: 'tap', times: 1 });
  });

  it('forgets what it saw of a scene and the later ones when the child starts over there', () => {
    let log = arriving('look', 2);
    log = logMove(log, 'tap', pebbles(1));
    log = arriving('count', 0, log);
    log = logMove(log, 'count', undefined);
    log = arriving('look', 2, log);
    expect(lessonRecord(log)).toEqual({ now: pebbles(2), ended: [], actions: [] });
  });

  it('has nothing to tell of earlier scenes when it picks up a saved place', () => {
    const log = logMove(arriving('count', 0), 'count', undefined);
    expect(lessonRecord(log)).toEqual({
      now: pebbles(0),
      ended: [],
      actions: [{ stepId: 'count', action: 'count', times: 1 }],
    });
  });

  it('records no move before the film reaches a scene', () => {
    expect(logMove(emptyLog, 'tap', pebbles(1))).toBe(emptyLog);
  });
});
