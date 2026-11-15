import { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';
import { describe, expect, it } from 'vitest';
import { boardFacts, type AnswerProgress } from '../lesson-board';
import { gardenBoard } from './garden-board';
import { arrive, respond, type GardenState, type Move } from './garden-story';
import { shots } from './script';

const scenes = { shots, answerScene: 'answer' } as const;
const unanswered: AnswerProgress = { answered: false };

function facts(state: GardenState, progress = unanswered) {
  return boardFacts(gardenBoard, gardenBalanceLesson.conclusions, scenes, state, progress);
}

// The board as the child sees it: each conclusion's sentence, with a mark
// for the ones in use.
function board(state: GardenState, progress = unanswered) {
  return facts(state, progress).map(({ says, lit }) => `${says}${lit ? ' *' : ''}`);
}

// How a conclusion's amounts are drawn: the count of single things, the
// thing's shape, and the frames or 「k×」 they are drawn with.
function drawn(state: GardenState, id: string, progress = unanswered) {
  return facts(state, progress)
    .find((fact) => fact.id === id)
    ?.amounts.map(({ count, shape, group, times }) => ({ count, shape, group, times }));
}

function after(state: GardenState, ...moves: Move[]) {
  return moves.reduce((now, move) => respond(now, move)?.state ?? now, state);
}

const dropApple: Move = { kind: 'drop', part: 'apple', place: 'basket' };
const tapApple: Move = { kind: 'tap', part: 'exchange' };

const cabbageApples = '1 棵青菜和 3 个苹果一样重';
const appleCucumbers = '1 个苹果和 3 根黄瓜一样重';
const cabbageGroups = '1 棵青菜和 3 组黄瓜一样重';
const counted = '1 棵青菜和 3 组黄瓜一样重，一共 9 根黄瓜';
const supposed = '假如 1 个苹果和 2 根黄瓜一样重';

const round = (count: number) => ({ count, shape: 'round' });
const cucumbers = (count: number) => ({ count, shape: 'long' });
const cabbageForFramedCucumbers = [round(1), { ...cucumbers(9), group: 3 }];

describe('the garden conclusion board', () => {
  it('stays empty while the two cabbages are weighed and the apple side sinks', () => {
    expect(board(arrive('leaves').state)).toEqual([]);
    expect(board(after(arrive('apples').state, dropApple, dropApple))).toEqual([]);
  });

  it('keeps one cabbage weighing three apples once the halved scale is level', () => {
    const level = after(arrive('apples').state, dropApple, dropApple, dropApple);
    expect(board(level)).toEqual([cabbageApples]);
    expect(board(arrive('exchange').state)).toEqual([cabbageApples]);
  });

  it('adds one apple weighing three cucumbers once they show', () => {
    expect(board(after(arrive('exchange').state, tapApple))).toEqual([
      cabbageApples,
      appleCucumbers,
    ]);
  });

  it('lights the apple and its cucumbers while each apple is swapped for them', () => {
    expect(board(arrive('bridge').state)).toEqual([cabbageApples, `${appleCucumbers} *`]);
  });

  it('asks for the count with the three groups in use, and the hints light what they use', () => {
    const answering = arrive('answer').state;
    expect(board(answering)).toEqual([cabbageApples, appleCucumbers, `${cabbageGroups} *`]);
    expect(board(answering, { answered: false, hint: 'one-cabbage' })).toEqual([
      `${cabbageApples} *`,
      appleCucumbers,
      `${cabbageGroups} *`,
    ]);
    expect(board(answering, { answered: false, hint: 'count-groups' })).toEqual([
      cabbageApples,
      `${appleCucumbers} *`,
      `${cabbageGroups} *`,
    ]);
  });

  it('draws every amount as the things themselves, the groups as the same cucumbers framed in threes', () => {
    const answering = arrive('answer').state;
    expect(drawn(answering, 'cabbage-apples')).toEqual([round(1), round(3)]);
    expect(drawn(answering, 'apple-cucumbers')).toEqual([round(1), cucumbers(3)]);
    expect(drawn(answering, 'cabbage-groups')).toEqual(cabbageForFramedCucumbers);
  });

  it('writes the nine cucumbers into the sentence once the child has said them, drawing nothing more', () => {
    const answering = arrive('answer').state;
    expect(board(answering, { answered: true })).toEqual([
      cabbageApples,
      appleCucumbers,
      `${counted} *`,
    ]);
    expect(drawn(answering, 'cabbage-groups', { answered: true })).toEqual(
      cabbageForFramedCucumbers,
    );
  });

  it('sets the two cucumbers to an apple beside the three in the variation', () => {
    expect(board(arrive('variation').state)).toEqual([
      cabbageApples,
      appleCucumbers,
      `${supposed} *`,
      counted,
    ]);
    expect(board(arrive('end').state)).toEqual([
      cabbageApples,
      `${appleCucumbers} *`,
      `${supposed} *`,
      counted,
    ]);
  });
});
