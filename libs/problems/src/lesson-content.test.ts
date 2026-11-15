import { describe, expect, it } from 'vitest';
import {
  drawnAtMost,
  inVariation,
  lessonContentProblems,
  lessonFlows,
  pictureProblems,
  recordWordMaxLength,
  type AnyLessonContent,
} from './lesson-content.js';
import { gardenBalanceLesson } from './lessons/garden-balance.js';
import { lessonTemplateLesson } from './lessons/lesson-template.js';
import { railChaseLesson } from './lessons/rail-chase.js';

describe('each lesson declared in lessons/', () => {
  it.each([gardenBalanceLesson, railChaseLesson, lessonTemplateLesson])(
    '$problem.id follows a listed flow and has no problems',
    (content) => {
      expect(lessonFlows).toContain(content.flow);
      expect(lessonContentProblems(content)).toEqual([]);
    },
  );
});

// Three marbles roll into a cup and the child counts them.
const fixture: AnyLessonContent = {
  problem: { id: 'marbles', version: 1 },
  flow: 'scene-by-scene',
  backdrop: 'toy-classroom-day',
  vocabulary: ['弹珠'],
  shots: ['roll', 'count', 'after'],
  answerScene: 'count',
  lines: {
    start: { scene: 'roll', text: '弹珠要滚进杯子里了。' },
    howMany: { scene: 'count', text: '杯子里有几颗弹珠？' },
    done: { scene: 'after', text: '都数好了。' },
  },
  scenes: {
    roll: { prompt: '地垫上有三颗弹珠和一个杯子。', entry: ['start'] },
    count: { prompt: '弹珠都在杯子里，孩子数一数。', entry: ['howMany'] },
    after: { prompt: '孩子数好了弹珠。', entry: ['done'] },
  },
  conclusions: [],
  recordWords: {
    places: { mat: '地垫上', cup: '杯子里' },
    things: { marble: { name: '弹珠', unit: '颗' } },
    states: { still: '弹珠都停住了' },
    actions: { push: '推了一颗弹珠' },
  },
};

const counted = {
  id: 'three-marbles',
  says: '杯子里有 3 颗弹珠',
  amounts: [[3, 'marble']],
  from: 'count',
  uses: ['count', 'after'],
} as const;
const supposed = {
  id: 'four-marbles',
  says: '假如杯子里有 4 颗弹珠',
  amounts: [[4, 'marble']],
  from: 'after',
  supposed: true,
} as const;

const problems = (change: Partial<AnyLessonContent>) =>
  lessonContentProblems({ ...fixture, ...change });
const keeping = (...conclusions: AnyLessonContent['conclusions']) => problems({ conclusions });

describe('the lesson content check', () => {
  it('passes content whose lines, scenes, conclusions and record words agree', () => {
    expect(problems({})).toEqual([]);
    expect(keeping(counted, supposed)).toEqual([]);
  });

  it('finds a line said in a scene the lesson does not have', () => {
    const lines = { ...fixture.lines, done: { scene: 'later', text: '都数好了。' } };
    expect(problems({ lines })).toEqual([
      'line done is said in later, which is not a scene',
      'entry line done is not a line of scene after',
    ]);
  });

  it("finds a scene that says nothing on arriving, or arrives with another scene's line", () => {
    const scenes = {
      ...fixture.scenes,
      count: { prompt: '孩子数一数。', entry: [] },
      after: { prompt: '孩子数好了。', entry: ['start', 'gone'] },
    };
    expect(problems({ scenes })).toEqual([
      'scene count has no entry lines',
      'entry line start is not a line of scene after',
      'entry line gone is not a line of scene after',
    ]);
  });

  it('finds a lesson flow that is not in the list', () => {
    const flow = 'step-by-step' as AnyLessonContent['flow'];
    expect(problems({ flow })).toEqual([
      'the lesson follows flow step-by-step, which is not in the list',
    ]);
  });

  it('finds an answer scene that is not a scene', () => {
    expect(problems({ answerScene: 'counting' })).toEqual(['answer scene counting is not a scene']);
  });

  it('finds an answer scene with no scene after it to play on into', () => {
    expect(problems({ answerScene: 'after' })).toEqual([
      'answer scene after has no scene after it',
    ]);
  });

  it('finds a 列式求解 answer scene with no equation found before it to solve', () => {
    const flow = 'derive-and-solve';
    const equation = { id: 'equation', says: '一共 x 颗', from: 'roll', uses: ['count'] };
    const unsolved = 'answer scene count uses no conclusion found before it to solve';
    expect(problems({ flow, conclusions: [equation] })).toEqual([]);
    expect(problems({ flow })).toEqual([unsolved]);
    expect(problems({ flow, conclusions: [{ ...equation, from: 'count' }] })).toEqual([unsolved]);
    const late = { ...equation, uses: ['after'] };
    expect(problems({ flow, conclusions: [late], answerScene: 'after' })).toEqual([
      'answer scene after has no scene after it',
    ]);
  });

  it('finds a record word that is empty or too long to tell', () => {
    const recordWords = {
      ...fixture.recordWords,
      things: { marble: { name: '弹珠', unit: ' ' } },
      actions: { push: '推'.repeat(recordWordMaxLength + 1) },
    };
    expect(problems({ recordWords })).toEqual([
      `record word marble is empty or longer than ${recordWordMaxLength} characters`,
      `record word push is empty or longer than ${recordWordMaxLength} characters`,
    ]);
  });

  it('finds a conclusion that first shows in a scene the lesson does not have', () => {
    expect(keeping({ ...counted, from: 'counting' })).toEqual([
      'conclusion three-marbles first shows in counting, which is not a scene',
    ]);
  });

  it('finds a conclusion used before it shows, or in a scene the lesson does not have', () => {
    expect(keeping({ ...counted, uses: ['roll', 'later'] })).toEqual([
      'conclusion three-marbles is used in roll, which is not a scene from count on',
      'conclusion three-marbles is used in later, which is not a scene from count on',
    ]);
  });

  it('finds a changed condition set before the final answer is right', () => {
    expect(keeping(counted, { ...supposed, from: 'count' })).toEqual([
      'conclusion four-marbles supposes a change before the variation starts',
    ]);
  });

  it('finds two conclusions with the same id', () => {
    expect(keeping(counted, counted)).toEqual(['conclusion three-marbles is declared twice']);
  });
});

// The marbles again, then a variation with four of them: the child guesses
// how many are in the cup, says why, and hears what it came to.
const varied: AnyLessonContent = {
  ...fixture,
  shots: ['roll', 'count', 'guess', 'why', 'reveal'],
  lines: {
    start: fixture.lines.start!,
    howMany: fixture.lines.howMany!,
    four: { scene: 'guess', text: '假如有四颗弹珠，杯子里会有几颗？' },
    why: { scene: 'why', text: '说说为什么。' },
    reveal: { scene: 'reveal', text: '杯子里有四颗。' },
  },
  scenes: {
    roll: fixture.scenes.roll!,
    count: fixture.scenes.count!,
    guess: { prompt: '假如有四颗弹珠，孩子猜一猜。', entry: ['four'] },
    why: { prompt: '孩子说说为什么。', entry: ['why'] },
    reveal: { prompt: '老师说出结果。', entry: ['reveal'] },
  },
  conclusions: [
    { ...counted, uses: ['count'] },
    { ...supposed, from: 'guess' },
    { id: 'four-in-cup', says: '那么杯子里有 4 颗弹珠', from: 'reveal' },
  ],
  variation: {
    guessScene: 'guess',
    reasonScene: 'why',
    revealScene: 'reveal',
    result: 'four-in-cup',
    keeps: [],
    choices: { cups: '杯子数', marbles: '弹珠数' },
  },
};
const variation = varied.variation!;
const varying = (change: Partial<NonNullable<AnyLessonContent['variation']>>) =>
  lessonContentProblems({ ...varied, variation: { ...variation, ...change } });

describe("the check of a lesson's variation", () => {
  it('passes a variation that guesses, reasons and reveals after the final answer', () => {
    expect(lessonContentProblems(varied)).toEqual([]);
  });

  it('tells the variation scenes from the problem before them, and none in a lesson without one', () => {
    expect(varied.shots.map((shot) => inVariation(varied, shot))).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
    expect(fixture.shots.map((shot) => inVariation(fixture, shot))).toEqual([false, false, false]);
  });

  it('finds scenes the lesson does not have, or out of order', () => {
    expect(varying({ reasonScene: 'later' })).toEqual([
      'variation scene later is not a scene',
      'the variation does not guess, reason and reveal after the answer scene, in that order',
    ]);
    expect(varying({ guessScene: 'why', reasonScene: 'guess' })).toEqual([
      'the variation does not guess, reason and reveal after the answer scene, in that order',
      'conclusion four-marbles supposes a change before the variation starts',
    ]);
  });

  it('finds kept conclusions the problem did not find before the variation', () => {
    expect(varying({ keeps: ['three-marbles'] })).toEqual([]);
    expect(varying({ keeps: ['five-marbles', 'four-in-cup'] })).toEqual([
      'the variation keeps five-marbles, which is not a conclusion found before it',
      'the variation keeps four-in-cup, which is not a conclusion found before it',
    ]);
  });

  it('finds a result missing, found outside the reveal, or not right after its condition', () => {
    const outOfPlace = (result: string) =>
      `the variation's result ${result} is not found in reveal right after its condition`;
    expect(varying({ result: 'five-in-cup' })).toEqual([outOfPlace('five-in-cup')]);
    expect(varying({ result: 'three-marbles' })).toEqual([outOfPlace('three-marbles')]);
    const [problem, condition, result] = varied.conclusions;
    expect(
      lessonContentProblems({ ...varied, conclusions: [condition!, problem!, result!] }),
    ).toEqual([outOfPlace('four-in-cup')]);
  });

  it('finds fewer than two reasons to tap, or one with no words', () => {
    expect(varying({ choices: { cups: '杯子数' } })).toEqual([
      'the variation has fewer than two reasons to tap',
    ]);
    expect(varying({ choices: { cups: '杯子数', marbles: ' ' } })).toEqual([
      'reason marbles has no words',
    ]);
  });
});

describe('the amounts a conclusion draws', () => {
  const drawing = (...amounts: AnyLessonContent['conclusions'][number]['amounts'] & {}) =>
    keeping({ ...counted, amounts });

  it(`passes up to ${drawnAtMost} things or frames drawn one by one, and 「k×」 past that`, () => {
    expect(drawing([1, 'marble'], [drawnAtMost, 'marble'])).toEqual([]);
    expect(
      drawing([12, 'marble', { group: 3 }], [24, 'marble', { group: 8, times: true }]),
    ).toEqual([]);
    expect(drawing([1, 'marble'], [64, 'marble', { times: true }])).toEqual([]);
  });

  it('finds an amount that counts nothing, or frames that do not divide it', () => {
    expect(
      drawing([0, 'marble'], [7, 'marble', { group: 2 }], [4, 'marble', { group: 1 }]),
    ).toEqual([
      'conclusion three-marbles draws 0 marble, which is not a count',
      'conclusion three-marbles draws 7 marble in frames of 2, which do not divide them',
      'conclusion three-marbles draws 4 marble in frames of 1, which do not divide them',
    ]);
  });

  it(`finds more than ${drawnAtMost} things or frames drawn with no 「k×」, and 「k×」 with nothing to multiply`, () => {
    expect(
      drawing(
        [drawnAtMost + 1, 'marble'],
        [30, 'marble', { group: 3 }],
        [18, 'marble', { group: 9, times: true }],
        [1, 'marble', { times: true }],
        [3, 'marble', { group: 3, times: true }],
      ),
    ).toEqual([
      `conclusion three-marbles draws ${drawnAtMost + 1} marble one by one, more than ${drawnAtMost}, with no 「k×」`,
      `conclusion three-marbles draws 30 marble in more than ${drawnAtMost} frames, with no 「k×」`,
      `conclusion three-marbles draws 18 marble in frames of more than ${drawnAtMost}`,
      'conclusion three-marbles draws 1 marble as 「k×」 with nothing to multiply',
      'conclusion three-marbles draws 3 marble as 「k×」 with nothing to multiply',
    ]);
  });

  it('checks the amount written on once the answer is right too', () => {
    const answer = { amount: [9, 'marble'] as const, says: '一共 9 颗' };
    expect(keeping({ ...counted, answer })).toEqual([
      `conclusion three-marbles draws 9 marble one by one, more than ${drawnAtMost}, with no 「k×」`,
    ]);
  });
});

describe('a scene picture', () => {
  it('passes one told in the words the content declares', () => {
    const picture = { things: [{ place: 'cup', thing: 'marble', count: 3 }], states: ['still'] };
    expect(pictureProblems(fixture, picture)).toEqual([]);
  });

  it('finds places, things and states the content does not declare, own names only', () => {
    const picture = {
      things: [{ place: 'shelf', thing: 'toString', count: 1 }],
      states: ['rolling'],
    };
    expect(pictureProblems(fixture, picture)).toEqual([
      'place shelf is not declared',
      'thing toString is not declared',
      'state rolling is not declared',
    ]);
  });
});
