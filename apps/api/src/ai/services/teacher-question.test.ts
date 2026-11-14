import type { LessonRecord } from '@education/contracts';
import { describe, expect, it, vi } from 'vitest';
import { RequestError } from '../../shared/request-error.js';
import { lessonMaterial } from '../domain/lesson-material.js';
import { offTaskSentence, type ModelQuestionReply } from '../domain/question-reply.js';
import { selfCheckSentence } from '../domain/verdict.js';
import { createTeacherQuestionService } from './teacher-question.js';

type Service = Parameters<typeof createTeacherQuestionService>;
type Plugin = NonNullable<ReturnType<Service[1]>>;
type Lesson = NonNullable<Plugin['lesson']>;

const credentials = { token: 'synthetic-session' };
const problem = { id: 'garden', version: 1 };
const basket = '天平旁边有一个篮子。孩子要把一棵青菜拖进篮子。';
const lesson: Lesson = {
  problem,
  flow: 'scene-by-scene',
  backdrop: 'garden-morning',
  vocabulary: ['青菜'],
  shots: ['basket', 'count', 'end'],
  answerScene: 'count',
  lines: {
    drag: { scene: 'basket', text: '把一棵青菜拖进篮子。' },
    ask: { scene: 'count', text: '一共有几根？' },
    bye: { scene: 'end', text: '数完了。' },
  },
  scenes: {
    basket: { prompt: basket, entry: ['drag'] },
    count: { prompt: '孩子要说出一共有几根。', entry: ['ask'] },
    end: { prompt: '孩子数完了。', entry: ['bye'] },
  },
  conclusions: [],
  recordWords: {
    places: { basket: '篮子' },
    things: { cabbage: { name: '青菜', unit: '棵' } },
    states: {},
    actions: { drag: '把青菜拖进篮子' },
  },
};
const left = { x: 0, y: 0, width: 0.5, height: 1 };
// The author opened the basket scene to AI help, within the left half of the
// sheet, the closing scene after the count, and a drawing step that is no
// scene of the lesson; the counting scene takes no questions.
const scenes: Plugin = {
  feedback: {
    basket: { prompt: basket, area: left },
    end: { prompt: '孩子数完了。' },
    sketch: { prompt: '孩子画出篮子。' },
  },
  lesson,
};
const record: LessonRecord = {
  now: { things: [{ place: 'basket', thing: 'cabbage', count: 0 }], states: [] },
  ended: [],
  actions: [],
};
const asked = (text: string, stepId = 'basket') => ({ stepId, text, record });
const answer: ModelQuestionReply = {
  reply: '篮子在天平旁边，把一棵青菜拖进去试试。',
  injection: false,
};

// A signed-in child who has not yet answered the problem right, unless the
// case says so.
function setup(plugin: Plugin = scenes) {
  const admit = vi.fn<Service[0]>(async () => false);
  const askModel = vi.fn<Service[2]>(async () => ({ status: 'ready', value: answer }));
  const find = (id: string, version: number) =>
    id === problem.id && version === problem.version ? plugin : undefined;
  return {
    admit,
    askModel,
    ask: createTeacherQuestionService(admit, find, askModel),
  };
}

describe('the teacher answers a question', () => {
  it('with one sentence from the model, sent only the lesson so far and the question', async () => {
    const { ask, askModel } = setup();
    const signal = new AbortController().signal;
    await expect(ask(credentials, problem, asked('篮子在哪里？'), signal)).resolves.toEqual({
      status: 'ready',
      source: 'ai',
      reply: answer.reply,
    });
    expect(askModel).toHaveBeenCalledExactlyOnceWith(
      credentials,
      { lesson: lessonMaterial(lesson, 'basket', record, false), question: '篮子在哪里？' },
      signal,
    );
  });

  it.each([
    ['judges a guess', { reply: '对，一共九根。', injection: false }, selfCheckSentence],
    ['was asked to change its rules', { ...answer, injection: true }, offTaskSentence],
  ])('without passing on a reply that %s', async (_name, value, reply) => {
    const { ask, askModel } = setup();
    askModel.mockResolvedValueOnce({ status: 'ready', value });
    await expect(ask(credentials, problem, asked('是不是九根？'))).resolves.toEqual({
      status: 'ready',
      source: 'ai',
      reply,
    });
  });

  it('passes gateway fallbacks through so the scene guidance takes over', async () => {
    const { ask, askModel } = setup();
    askModel.mockResolvedValueOnce({ status: 'fallback', reason: 'timeout' });
    await expect(ask(credentials, problem, asked('篮子在哪里？'))).resolves.toEqual({
      status: 'fallback',
      reason: 'timeout',
    });
  });

  it('leaves a record that does not fit the lesson to the scene guidance, before the rules or the model', async () => {
    const checkStep = vi.fn();
    const { ask, askModel } = setup({ ...scenes, checkStep });
    const wrong = { ...record, actions: [{ stepId: 'end', action: 'drag', times: 1 }] };
    await expect(
      ask(credentials, problem, { stepId: 'basket', text: '为什么？', record: wrong }),
    ).resolves.toEqual({ status: 'fallback', reason: 'invalid-input' });
    expect(checkStep).not.toHaveBeenCalled();
    expect(askModel).not.toHaveBeenCalled();
  });

  it('tells a scene past the answer only to a child the server has seen answer right', async () => {
    const { ask, admit, askModel } = setup();
    const after = asked('刚才数出几根？', 'end');
    await expect(ask(credentials, problem, after)).resolves.toEqual({
      status: 'fallback',
      reason: 'invalid-input',
    });
    expect(askModel).not.toHaveBeenCalled();
    admit.mockResolvedValueOnce(true);
    await expect(ask(credentials, problem, after)).resolves.toMatchObject({ source: 'ai' });
    expect(admit).toHaveBeenLastCalledWith(credentials, problem);
    expect(askModel).toHaveBeenCalledExactlyOnceWith(
      credentials,
      { lesson: lessonMaterial(lesson, 'end', record, true), question: '刚才数出几根？' },
      undefined,
    );
  });
});

describe('the author’s rules', () => {
  const rule = { status: 'correct' as const, instruction: '说得对！还是三组。', stepId: 'basket' };

  it('answer words they settle, without the model', async () => {
    const checkStep = vi.fn(() => rule);
    const { ask, askModel } = setup({ ...scenes, checkStep });
    await expect(ask(credentials, problem, asked('还是三组'))).resolves.toEqual({
      status: 'ready',
      source: 'rules',
      reply: rule.instruction,
    });
    expect(checkStep).toHaveBeenCalledWith({ stepId: 'basket', answer: '还是三组' });
    expect(askModel).not.toHaveBeenCalled();
  });

  it('leave anything inconclusive to the model', async () => {
    const checkStep = () => ({ ...rule, status: 'uncertain' as const });
    const { ask, askModel } = setup({ ...scenes, checkStep });
    await expect(ask(credentials, problem, asked('篮子在哪里？'))).resolves.toMatchObject({
      source: 'ai',
    });
    expect(askModel).toHaveBeenCalledOnce();
  });

  it('are held to the area of the step, pointing outside it leaves the question to the model', async () => {
    const outside = { x: 0.6, y: 0.1, width: 0.2, height: 0.2 };
    const checkStep = () => ({ ...rule, status: 'needs-work' as const, highlight: outside });
    const { ask, askModel } = setup({ ...scenes, checkStep });
    await expect(ask(credentials, problem, asked('还是三组'))).resolves.toMatchObject({
      source: 'ai',
    });
    expect(askModel).toHaveBeenCalledOnce();
  });
});

describe('access', () => {
  it('requires a child session first', async () => {
    const { ask, admit, askModel } = setup();
    admit.mockRejectedValueOnce(new RequestError(401, 'login'));
    await expect(ask(credentials, problem, asked('篮子在哪里？'))).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(askModel).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown problem', { id: 'other', version: 1 }, 'basket'],
    ['a scene the author did not open to questions', problem, 'count'],
    ['a step that is no scene of the lesson', problem, 'sketch'],
    ['a name that is no step of its own', problem, 'toString'],
  ])('rejects %s', async (_name, target, stepId) => {
    const { ask, askModel } = setup();
    await expect(ask(credentials, target, asked('为什么？', stepId))).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(askModel).not.toHaveBeenCalled();
  });

  it('rejects a problem version without lesson content', async () => {
    const { ask, askModel } = setup({ feedback: scenes.feedback });
    await expect(ask(credentials, problem, asked('为什么？'))).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(askModel).not.toHaveBeenCalled();
  });
});
