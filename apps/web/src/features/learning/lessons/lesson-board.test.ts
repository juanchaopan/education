import type { Conclusion } from '@education/problems/lesson-content';
import { describe, expect, it } from 'vitest';
import { boardFacts, type AnswerProgress, type LessonBoard } from './lesson-board';

type Shot = 'weigh' | 'swap' | 'answer' | 'suppose';
type State = Readonly<{ shot: Shot | 'opening'; level: boolean }>;

const board: LessonBoard<State, 'box' | 'ball' | 'group'> = {
  pictures: { box: 'box', ball: 'ball', group: 'group' },
  found: { 'box-balls': ({ level }) => level },
};

const conclusions: readonly Conclusion<Shot, 'box' | 'ball' | 'group'>[] = [
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
      [3, 'group'],
    ],
    from: 'answer',
    uses: ['answer'],
    answer: { amount: [9, 'ball'], says: '1 个盒子和 3 组球、9 个球一样重' },
  },
  {
    id: 'box-balls-two',
    says: '假如 1 个盒子和 2 个球一样重',
    amounts: [
      [1, 'box'],
      [2, 'ball'],
    ],
    from: 'suppose',
    uses: ['suppose'],
    supposed: true,
  },
];

const scenes = { shots: ['weigh', 'swap', 'answer', 'suppose'], answer: 'answer' } as const;
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

  it('draws each conclusion with its amounts in order and the pictures for them', () => {
    const [first] = facts({ shot: 'swap', level: false });
    expect(first).toEqual({
      id: 'box-balls',
      says: '1 个盒子和 3 个球一样重',
      amounts: [
        { key: '0-box', count: 1, picture: 'box' },
        { key: '1-ball', count: 3, picture: 'ball' },
      ],
      lit: false,
      supposed: false,
    });
  });

  it('lights the conclusions the scene on screen uses', () => {
    expect(lit({ shot: 'answer', level: false })).toEqual(['box-groups']);
    expect(lit({ shot: 'suppose', level: false })).toEqual(['box-balls-two']);
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
    expect(unanswered?.amounts.map(({ count }) => count)).toEqual([1, 3]);
    const answered = facts(answering, { answered: true }).find(({ id }) => id === 'box-groups');
    expect(answered?.amounts.map(({ count }) => count)).toEqual([1, 3, 9]);
    expect(answered?.says).toBe('1 个盒子和 3 组球、9 个球一样重');
  });

  it('keeps the count written on in the scenes after the answer, and the changed condition apart', () => {
    const later = facts({ shot: 'suppose', level: false });
    expect(later.map(({ id, supposed }) => [id, supposed])).toEqual([
      ['box-balls', false],
      ['box-groups', false],
      ['box-balls-two', true],
    ]);
    expect(later[1]?.amounts.map(({ count }) => count)).toEqual([1, 3, 9]);
  });
});
