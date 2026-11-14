import { describe, expect, it } from 'vitest';
import {
  lessonContentProblems,
  lessonFlows,
  pictureProblems,
  recordWordMaxLength,
  type AnyLessonContent,
} from './lesson-content.js';
import { gardenBalanceLesson } from './lessons/garden-balance.js';
import { lessonTemplateLesson } from './lessons/lesson-template.js';

describe('each lesson declared in lessons/', () => {
  it.each([gardenBalanceLesson, lessonTemplateLesson])(
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

  it('finds a supposed conclusion with none found before it to stand beside', () => {
    const beside =
      'conclusion four-marbles supposes a change but has no conclusion on the board to stand beside';
    expect(keeping(supposed)).toEqual([beside]);
    expect(
      keeping({ ...counted, from: 'after', uses: [] }, { ...supposed, from: 'count' }),
    ).toEqual([beside]);
  });

  it('finds two conclusions with the same id', () => {
    expect(keeping(counted, counted)).toEqual(['conclusion three-marbles is declared twice']);
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
