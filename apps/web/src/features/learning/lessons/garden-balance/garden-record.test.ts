import { pictureProblems } from '@education/problems/lesson-content';
import { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';
import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useLessonRecord } from '../../interaction/useLessonRecord';
import { gardenRecording } from './garden-record';
import { arrive, respond, type GardenState, type Move } from './garden-story';
import { shots } from './script';

type Shot = (typeof shots)[number];
const dropped = (part: 'leaf' | 'apple'): Move => ({ kind: 'drop', part, place: 'basket' });
const tapped = (part: 'exchange' | 'replace'): Move => ({ kind: 'tap', part });

// Plays moves from a scene through the lesson page's own record, telling it
// of each move and of each scene the film then shows, and gives the record a
// question would then carry. A move whose lines lead on with `then` stays in
// its scene here, as the film stays there until the lines are heard.
function play(from: Shot, ...moves: Move[]) {
  const { result } = renderHook(() => useLessonRecord(gardenRecording, shots));
  const record = result.current;
  let state: GardenState = arrive(from).state;
  record.arrive(from, state);
  for (const move of moves) {
    const reaction = respond(state, move);
    record.move(state, move, reaction);
    if (!reaction) continue;
    if (reaction.state.shot !== state.shot && reaction.state.shot !== 'opening')
      record.arrive(reaction.state.shot, reaction.state);
    state = reaction.state;
  }
  return record.read();
}

it('describes every scene in words its content declares', () => {
  for (const shot of shots) {
    const picture = gardenRecording.picture(arrive(shot).state);
    expect(pictureProblems(gardenBalanceLesson, picture)).toEqual([]);
  }
});

it('ends the first scene with the cabbage the child put in the basket', () => {
  const record = play('leaves', dropped('leaf'), dropped('apple'), dropped('apple'));
  const opened = gardenRecording.picture(arrive('apples').state);
  expect(record.ended).toEqual([{ stepId: 'leaves', picture: opened }]);
  expect(opened.things).toContainEqual({ place: 'basket', thing: 'cabbage', count: 1 });
  expect(opened.states).toEqual(['apples-down']);
  expect(record.now).toEqual({
    things: [
      { place: 'left-pan', thing: 'cabbage', count: 1 },
      { place: 'right-pan', thing: 'apple', count: 4 },
      { place: 'basket', thing: 'cabbage', count: 1 },
      { place: 'basket', thing: 'apple', count: 2 },
    ],
    states: ['apples-down'],
  });
  expect(record.actions).toEqual([
    { stepId: 'leaves', action: 'cabbage-to-basket', times: 1 },
    { stepId: 'apples', action: 'apple-to-basket', times: 2 },
  ]);
});

it('ends the halving with the scale level, and shows the cucumbers an apple weighs', () => {
  const halved = play('apples', dropped('apple'), dropped('apple'), dropped('apple'));
  expect(halved.now.states).toEqual(['level']);
  const touched = play('exchange', tapped('exchange'));
  expect(touched.now).toEqual({
    things: [
      { place: 'left-pan', thing: 'apple', count: 1 },
      { place: 'right-pan', thing: 'cucumber', count: 3 },
    ],
    states: ['level'],
  });
  expect(touched.actions).toEqual([{ stepId: 'exchange', action: 'apple-tapped', times: 1 }]);
});

it('counts the groups of three swapped in, then of two in the variation, beside its sign', () => {
  expect(play('bridge', tapped('replace'), tapped('replace')).now.things).toEqual([
    { place: 'left-pan', thing: 'cabbage', count: 1 },
    { place: 'right-pan', thing: 'apple', count: 1 },
    { place: 'right-pan', thing: 'group-of-three', count: 2 },
  ]);
  expect(gardenRecording.picture(arrive('end').state)).toEqual({
    things: [
      { place: 'left-pan', thing: 'cabbage', count: 1 },
      { place: 'right-pan', thing: 'apple', count: 0 },
      { place: 'right-pan', thing: 'group-of-two', count: 3 },
      { place: 'basket', thing: 'cucumber', count: 2 },
    ],
    states: ['level', 'two-each-sign'],
  });
});

it('ends the swapping scene with every apple swapped, as the count is asked of it', () => {
  const record = play('bridge', tapped('replace'), tapped('replace'), tapped('replace'));
  const asked = gardenRecording.picture(arrive('answer').state);
  expect(record.ended).toEqual([{ stepId: 'bridge', picture: asked }]);
  expect(asked.things).toContainEqual({ place: 'right-pan', thing: 'group-of-three', count: 3 });
  expect(record.actions).toEqual([{ stepId: 'bridge', action: 'apple-swapped', times: 3 }]);
});

it('records only the moves a scene takes', () => {
  expect(play('leaves', dropped('apple'), tapped('exchange')).actions).toEqual([]);
  expect(play('answer', tapped('replace')).actions).toEqual([]);
});
