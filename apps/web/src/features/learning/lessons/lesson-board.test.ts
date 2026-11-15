import type { Conclusion } from '@education/problems/lesson-content';
import { describe, expect, it } from 'vitest';
import {
  boardFacts,
  type AnswerProgress,
  type BoardScenes,
  type LessonBoard,
} from './lesson-board';

type Shot = 'weigh' | 'swap' | 'answer' | 'suppose' | 'why' | 'reveal';
type State = Readonly<{ shot: Shot | 'opening'; level: boolean }>;

const board: LessonBoard<State, 'box' | 'ball'> = {
  pictures: { box: { art: 'box', shape: 'tall' }, ball: { art: 'ball', shape: 'round' } },
  found: { 'box-balls': ({ level }) => level },
};

const conclusions: readonly Conclusion<Shot, 'box' | 'ball'>[] = [
  {
    id: 'box-balls',
    says: '1 个盒子和 3 个球一样重',
    amounts: [
      [1, 'box'],
      [3, 'ball'],
    ],
    from: 'weigh',
    hints: ['first-scale'],
  },
  {
    id: 'box-groups',
    says: '1 个盒子和 3 组球一样重',
    amounts: [
      [1, 'box'],
      [9, 'ball', { group: 3 }],
    ],
    from: 'answer',
    uses: ['answer'],
    answer: { amount: [9, 'ball', { times: true }], says: '1 个盒子和 3 组球、9 个球一样重' },
  },
  {
    id: 'box-balls-two',
    says: '假如 1 个盒子和 2 个球一样重',
    amounts: [
      [1, 'box'],
      [2, 'ball'],
    ],
    from: 'suppose',
    uses: ['suppose', 'why'],
    supposed: true,
  },
  {
    id: 'box-groups-two',
    says: '那么 1 个盒子和 3 组球一样重，一共 6 个球',
    amounts: [
      [1, 'box'],
      [6, 'ball', { group: 2 }],
    ],
    from: 'reveal',
    uses: ['reveal'],
  },
];

const scenes: BoardScenes<Shot> = {
  shots: ['weigh', 'swap', 'answer', 'suppose', 'why', 'reveal'],
  answerScene: 'answer',
  variation: {
    guessScene: 'suppose',
    reasonScene: 'why',
    revealScene: 'reveal',
    result: 'box-groups-two',
    keeps: ['box-balls'],
    choices: { groups: '组数', each: '每组个数' },
  },
};
const fresh: AnswerProgress = { answered: false };

const facts = (state: State, progress = fresh) =>
  boardFacts(board, conclusions, scenes, state, progress);
const ids = (state: State, progress = fresh) => facts(state, progress).map(({ id }) => id);
const lit = (state: State, progress = fresh) =>
  facts(state, progress)
    .filter((fact) => fact.lit)
    .map(({ id }) => id);

describe('the conclusion board', () => {
  it('shows nothing on the title card or before a scene has found anything', () => {
    expect(ids({ shot: 'opening', level: true })).toEqual([]);
    expect(ids({ shot: 'weigh', level: false })).toEqual([]);
  });

  it('shows a conclusion once its scene finds it, and keeps it in the scenes after', () => {
    expect(ids({ shot: 'weigh', level: true })).toEqual(['box-balls']);
    expect(ids({ shot: 'swap', level: false })).toEqual(['box-balls']);
    expect(ids({ shot: 'answer', level: false })).toEqual(['box-balls', 'box-groups']);
  });

  it('draws each conclusion with its amounts in order and the pictures and shapes for them', () => {
    const [first] = facts({ shot: 'swap', level: false });
    expect(first).toEqual({
      id: 'box-balls',
      says: '1 个盒子和 3 个球一样重',
      amounts: [
        { key: '0-box', count: 1, picture: 'box', shape: 'tall' },
        { key: '1-ball', count: 3, picture: 'ball', shape: 'round' },
      ],
      lit: false,
      kind: undefined,
    });
  });

  it('passes on how an amount is drawn: in frames, or as 「k×」', () => {
    const groups = facts({ shot: 'answer', level: false }, { answered: true }).find(
      ({ id }) => id === 'box-groups',
    );
    expect(groups?.amounts.slice(1)).toEqual([
      { key: '1-ball', count: 9, picture: 'ball', shape: 'round', group: 3 },
      { key: '2-ball', count: 9, picture: 'ball', shape: 'round', times: true },
    ]);
  });

  it('lights the conclusions the scene on screen uses', () => {
    expect(lit({ shot: 'answer', level: false })).toEqual(['box-groups']);
    expect(lit({ shot: 'suppose', level: false })).toEqual(['box-balls-two']);
    expect(lit({ shot: 'reveal', level: false })).toEqual(['box-groups-two']);
  });

  it('lights what the last hint uses, only while the child is still answering', () => {
    const answering = { shot: 'answer', level: false } as const;
    expect(lit(answering, { answered: false, hint: 'first-scale' })).toEqual([
      'box-balls',
      'box-groups',
    ]);
    expect(lit(answering, { answered: true, hint: 'first-scale' })).toEqual(['box-groups']);
    expect(
      lit({ shot: 'suppose', level: false }, { answered: false, hint: 'first-scale' }),
    ).toEqual(['box-balls-two']);
  });

  it('writes the count on only once the child has answered it right', () => {
    const answering = { shot: 'answer', level: false } as const;
    const unanswered = facts(answering).find(({ id }) => id === 'box-groups');
    expect(unanswered?.amounts.map(({ count }) => count)).toEqual([1, 9]);
    const answered = facts(answering, { answered: true }).find(({ id }) => id === 'box-groups');
    expect(answered?.amounts.map(({ count }) => count)).toEqual([1, 9, 9]);
    expect(answered?.says).toBe('1 个盒子和 3 组球、9 个球一样重');
  });
});

describe('the conclusion board in the variation, which is another problem', () => {
  it('puts away what the variation does not keep, and shows its condition as 假如', () => {
    const varying = facts({ shot: 'suppose', level: false });
    expect(varying.map(({ id, kind }) => [id, kind])).toEqual([
      ['box-balls', undefined],
      ['box-balls-two', 'supposed'],
    ]);
    expect(ids({ shot: 'why', level: false })).toEqual(['box-balls', 'box-balls-two']);
  });

  it('adds what the condition came to as 那么 once revealed, and keeps that look to the end', () => {
    const revealed = facts({ shot: 'reveal', level: false });
    expect(revealed.map(({ id, kind }) => [id, kind])).toEqual([
      ['box-balls', undefined],
      ['box-balls-two', 'supposed'],
      ['box-groups-two', 'result'],
    ]);
  });

  it('keeps every conclusion before the variation in a lesson that declares none', () => {
    const plain = { shots: scenes.shots, answerScene: scenes.answerScene };
    const later = boardFacts(board, conclusions, plain, { shot: 'why', level: false }, fresh);
    expect(later.map(({ id }) => id)).toEqual(['box-balls', 'box-groups', 'box-balls-two']);
    expect(later[1]?.amounts.map(({ count }) => count)).toEqual([1, 9, 9]);
  });
});
