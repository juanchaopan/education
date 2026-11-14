import { describe, expect, it } from 'vitest';
import { lessonContentProblems, lessonFlows, type AnyLessonContent } from './lesson-content.js';
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

const fixture: AnyLessonContent = {
  problem: { id: 'fixture', version: 1 },
  flow: 'scene-by-scene',
  vocabulary: ['小石子'],
  shots: ['look', 'count', 'after'],
  answerScene: 'count',
  lines: {
    hello: { scene: 'look', text: '看看这颗小石子。' },
    ask: { scene: 'count', text: '一共有几颗？' },
    bye: { scene: 'after', text: '数完了。' },
  },
  scenes: {
    look: { prompt: '桌上有一颗小石子。', entry: ['hello'] },
    count: { prompt: '孩子数小石子。', entry: ['ask'] },
    after: { prompt: '孩子数完了。', entry: ['bye'] },
  },
  conclusions: [],
};

const counted = {
  id: 'one-pebble',
  says: '桌上有 1 颗小石子',
  amounts: [[1, 'pebble']],
  from: 'count',
  uses: ['count', 'after'],
} as const;
const supposed = {
  id: 'two-pebbles',
  says: '假如桌上有 2 颗小石子',
  amounts: [[2, 'pebble']],
  from: 'after',
  supposed: true,
} as const;

const problems = (change: Partial<AnyLessonContent>) =>
  lessonContentProblems({ ...fixture, ...change });
const keeping = (...conclusions: AnyLessonContent['conclusions']) => problems({ conclusions });

describe('the lesson content check', () => {
  it('passes content whose lines, scenes and conclusions agree', () => {
    expect(problems({})).toEqual([]);
    expect(keeping(counted, supposed)).toEqual([]);
  });

  it('finds a line said in a scene the lesson does not have', () => {
    const lines = { ...fixture.lines, bye: { scene: 'later', text: '数完了。' } };
    expect(problems({ lines })).toEqual([
      'line bye is said in later, which is not a scene',
      'entry line bye is not a line of scene after',
    ]);
  });

  it("finds a scene that says nothing on arriving, or arrives with another scene's line", () => {
    const scenes = {
      ...fixture.scenes,
      count: { prompt: '孩子数小石子。', entry: [] },
      after: { prompt: '孩子数完了。', entry: ['hello', 'gone'] },
    };
    expect(problems({ scenes })).toEqual([
      'scene count has no entry lines',
      'entry line hello is not a line of scene after',
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

  it('finds a conclusion that first shows in a scene the lesson does not have', () => {
    expect(keeping({ ...counted, from: 'counting' })).toEqual([
      'conclusion one-pebble first shows in counting, which is not a scene',
    ]);
  });

  it('finds a conclusion used before it shows, or in a scene the lesson does not have', () => {
    expect(keeping({ ...counted, uses: ['look', 'later'] })).toEqual([
      'conclusion one-pebble is used in look, which is not a scene from count on',
      'conclusion one-pebble is used in later, which is not a scene from count on',
    ]);
  });

  it('finds a supposed conclusion with none found before it to stand beside', () => {
    const beside =
      'conclusion two-pebbles supposes a change but has no conclusion on the board to stand beside';
    expect(keeping(supposed)).toEqual([beside]);
    expect(
      keeping({ ...counted, from: 'after', uses: [] }, { ...supposed, from: 'count' }),
    ).toEqual([beside]);
  });

  it('finds two conclusions with the same id', () => {
    expect(keeping(counted, counted)).toEqual(['conclusion one-pebble is declared twice']);
  });
});
