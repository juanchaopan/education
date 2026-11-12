import type { KeyActionOf, ScenePictureOf } from '@education/problems/lesson-content';
import type { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';
import type { LessonRecording } from '../../interaction/lesson-record';
import { cucumbersPerApple, tilt, type GardenState, type Move } from './garden-story';

// How the garden tells the teacher what is on screen and what the child did,
// in the words its content declares.
type Picture = ScenePictureOf<typeof gardenBalanceLesson>;
type Action = KeyActionOf<typeof gardenBalanceLesson>;

const cabbages = 2;
const apples = 6;
const groups = 3;

// The halving scale: the cabbages left on it, the apples on its other pan,
// and what the child has put in the basket; the apple side sinks while it
// holds more apples than one cabbage weighs.
function weighing(state: GardenState): Picture {
  return {
    things: [
      { place: 'left-pan', thing: 'cabbage', count: state.leaves },
      { place: 'right-pan', thing: 'apple', count: state.apples },
      { place: 'basket', thing: 'cabbage', count: cabbages - state.leaves },
      { place: 'basket', thing: 'apple', count: apples - state.apples },
    ],
    states: [tilt(state) > 0 ? 'apples-down' : 'level'],
  };
}

// One apple against the cucumbers it weighs, which show once it is touched.
function exchanging({ revealed }: GardenState): Picture {
  return {
    things: [
      { place: 'left-pan', thing: 'apple', count: 1 },
      { place: 'right-pan', thing: 'cucumber', count: revealed ? 3 : 0 },
    ],
    states: [revealed ? 'level' : 'apples-down'],
  };
}

// One cabbage against the apples not yet swapped and the groups of cucumbers
// that replaced the others; the variation's basket holds its spare
// cucumbers under its sign.
function swapping(state: GardenState): Picture {
  const two = cucumbersPerApple(state.shot) === 2;
  const things: Picture['things'] = [
    { place: 'left-pan', thing: 'cabbage', count: 1 },
    { place: 'right-pan', thing: 'apple', count: groups - state.replaced },
    { place: 'right-pan', thing: two ? 'group-of-two' : 'group-of-three', count: state.replaced },
  ];
  if (!two) return { things, states: ['level'] };
  return {
    things: [...things, { place: 'basket', thing: 'cucumber', count: 2 }],
    states: ['level', 'two-each-sign'],
  };
}

function picture(state: GardenState): Picture {
  if (state.shot === 'opening' || state.shot === 'leaves' || state.shot === 'apples')
    return weighing(state);
  if (state.shot === 'exchange') return exchanging(state);
  return swapping(state);
}

// Each move the scene takes is a key action; the garden's props only move
// when they are the next thing to do, so it has no wrong move to tell.
function action(_state: GardenState, move: Move, taken: boolean): Action | undefined {
  if (!taken) return;
  if (move.kind === 'drop') return move.part === 'leaf' ? 'cabbage-to-basket' : 'apple-to-basket';
  return move.part === 'exchange' ? 'apple-tapped' : 'apple-swapped';
}

export const gardenRecording = { picture, action } satisfies LessonRecording<GardenState, Move>;
