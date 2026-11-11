import { uncertainFeedback } from '@education/contracts';
import { describe, expect, it, vi } from 'vitest';
import { RequestError } from '../../shared/request-error.js';
import { selfCheckFeedback, type ModelFeedback } from '../domain/teaching-feedback.js';
import { createTeachingFeedbackService } from './teaching-feedback.js';

const credentials = { token: 'synthetic-session' };
const problem = { id: 'count-dots', version: 1 };
const step = { prompt: '数一数左边的点。', area: { x: 0, y: 0, width: 0.5, height: 1 } };

function pngBase64() {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.write('IHDR', 12, 'latin1');
  header.writeUInt32BE(512, 16);
  header.writeUInt32BE(384, 20);
  const end = Buffer.from('0000000049454e44ae426082', 'hex');
  return Buffer.concat([header, end]).toString('base64');
}

const modelReply: ModelFeedback = {
  status: 'needs-work',
  instruction: '再数一数框里的点。',
  confidence: 0.9,
  injection: false,
  highlight: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
};

function setup(
  plugin: Parameters<typeof createTeachingFeedbackService>[1] extends (...a: never) => infer R
    ? R
    : never,
) {
  const authenticate = vi.fn(async () => {});
  const askModel = vi.fn<Parameters<typeof createTeachingFeedbackService>[2]>(async () => ({
    status: 'ready',
    value: modelReply,
  }));
  const find = vi.fn((id: string, version: number) =>
    id === problem.id && version === problem.version ? plugin : undefined,
  );
  return {
    authenticate,
    askModel,
    request: createTeachingFeedbackService(authenticate, find, askModel),
  };
}

const withStep = { feedback: { 'count-left': step } };

describe('rules before the model', () => {
  const rule = { status: 'correct' as const, instruction: '数对了！', stepId: 'count-left' };

  it('answers from authored rules without contacting the model', async () => {
    const checkStep = vi.fn(async () => rule);
    const { request, askModel } = setup({ ...withStep, checkStep });
    await expect(
      request(credentials, problem, { stepId: 'count-left', text: '三个' }),
    ).resolves.toEqual({
      status: 'ready',
      source: 'rules',
      feedback: rule,
    });
    expect(checkStep).toHaveBeenCalledWith({ stepId: 'count-left', answer: '三个' });
    expect(askModel).not.toHaveBeenCalled();
  });

  it('hands inconclusive or invalid rule results to the model', async () => {
    for (const result of [
      { status: 'uncertain' as const, instruction: '再看看。', stepId: 'count-left' },
      { status: 'correct' as const, instruction: '好！', stepId: 'another-step' },
    ]) {
      const { request, askModel } = setup({ ...withStep, checkStep: () => result });
      const reply = await request(credentials, problem, { stepId: 'count-left', text: '三个' });
      expect(reply).toMatchObject({ status: 'ready', source: 'ai' });
      expect(askModel).toHaveBeenCalledOnce();
    }
  });

  it('never lets text rules judge a submission that includes a drawing', async () => {
    const checkStep = vi.fn(async () => rule);
    const { request, askModel } = setup({ ...withStep, checkStep });
    const image = pngBase64();
    await expect(
      request(credentials, problem, { stepId: 'count-left', text: '三个', image }),
    ).resolves.toMatchObject({ source: 'ai' });
    await request(credentials, problem, { stepId: 'count-left', image });
    expect(checkStep).not.toHaveBeenCalled();
    expect(askModel).toHaveBeenCalledTimes(2);
  });

  it('surfaces a failing rule instead of silently paying for a model call', async () => {
    const { request, askModel } = setup({
      ...withStep,
      checkStep: () => {
        throw new Error('authoring bug');
      },
    });
    await expect(
      request(credentials, problem, { stepId: 'count-left', text: '三个' }),
    ).rejects.toThrow('authoring bug');
    expect(askModel).not.toHaveBeenCalled();
  });
});

describe('model feedback', () => {
  it('sends only the authored step, the text and a validated image', async () => {
    const { request, askModel } = setup(withStep);
    const image = pngBase64();
    const reply = await request(credentials, problem, {
      stepId: 'count-left',
      text: '我画好了',
      image,
    });
    expect(askModel).toHaveBeenCalledExactlyOnceWith(
      credentials,
      { prompt: step.prompt, text: '我画好了', imageUrl: `data:image/png;base64,${image}` },
      undefined,
    );
    expect(reply).toEqual({
      status: 'ready',
      source: 'ai',
      feedback: {
        status: 'needs-work',
        instruction: modelReply.instruction,
        stepId: 'count-left',
        highlight: modelReply.highlight,
      },
    });
  });

  it('outlines nothing for a text-only submission', async () => {
    const { request } = setup(withStep);
    await expect(
      request(credentials, problem, { stepId: 'count-left', text: '我数了四个' }),
    ).resolves.toEqual({
      status: 'ready',
      source: 'ai',
      feedback: { status: 'needs-work', instruction: modelReply.instruction, stepId: 'count-left' },
    });
  });

  it('turns unreliable replies into a request to confirm', async () => {
    const { request, askModel } = setup(withStep);
    askModel.mockResolvedValueOnce({
      status: 'ready',
      value: { ...modelReply, highlight: { x: 0.4, y: 0.1, width: 0.3, height: 0.2 } },
    });
    await expect(
      request(credentials, problem, { stepId: 'count-left', image: pngBase64() }),
    ).resolves.toEqual({
      status: 'ready',
      source: 'ai',
      feedback: uncertainFeedback('count-left'),
    });
  });

  it('never passes on a reply that confirms the guess in a question', async () => {
    const { request, askModel } = setup(withStep);
    askModel.mockResolvedValueOnce({
      status: 'ready',
      value: { ...modelReply, status: 'correct', instruction: '对，左边有三个点。' },
    });
    await expect(
      request(credentials, problem, { stepId: 'count-left', text: '是三个对不对？' }),
    ).resolves.toEqual({
      status: 'ready',
      source: 'ai',
      feedback: selfCheckFeedback('count-left'),
    });
  });

  it('passes gateway fallbacks through so guided teaching continues', async () => {
    const { request, askModel } = setup(withStep);
    askModel.mockResolvedValueOnce({ status: 'fallback', reason: 'usage-limited' });
    await expect(
      request(credentials, problem, { stepId: 'count-left', text: '好了' }),
    ).resolves.toEqual({
      status: 'fallback',
      reason: 'usage-limited',
    });
  });

  it('refuses an unreadable image before any model call', async () => {
    const { request, askModel } = setup(withStep);
    await expect(
      request(credentials, problem, {
        stepId: 'count-left',
        image: Buffer.from('not a png at all......').toString('base64'),
      }),
    ).resolves.toEqual({ status: 'fallback', reason: 'invalid-input' });
    expect(askModel).not.toHaveBeenCalled();
  });

  it('forwards cancellation to the model call', async () => {
    const { request, askModel } = setup(withStep);
    const controller = new AbortController();
    await request(credentials, problem, { stepId: 'count-left', text: '好了' }, controller.signal);
    expect(askModel.mock.calls[0]?.[2]).toBe(controller.signal);
  });
});

describe('access', () => {
  it('requires a child session first', async () => {
    const { request, authenticate, askModel } = setup(withStep);
    authenticate.mockRejectedValueOnce(new RequestError(401, 'login'));
    await expect(
      request(credentials, problem, { stepId: 'count-left', text: '好了' }),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(askModel).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown problem', { id: 'other', version: 1 }, 'count-left'],
    ['an unknown version', { id: 'count-dots', version: 2 }, 'count-left'],
    ['a step the author did not declare', problem, 'count-right'],
    ['an inherited property name', problem, 'constructor'],
  ])('rejects %s', async (_name, target, stepId) => {
    const { request, askModel } = setup(withStep);
    await expect(request(credentials, target, { stepId, text: '好了' })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(askModel).not.toHaveBeenCalled();
  });
});
