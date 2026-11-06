import { afterEach, expect, it, vi } from 'vitest';
import { RequestError } from '../../shared/request-error.js';
import { createTutoringGateway } from './tutoring-gateway.js';

const input = { step: '观察两组物体的数量。', question: '先数哪一组？' };
const settings = { paidAiEnabled: true, eligible: true, apiKey: 'synthetic-key' };
const credentials = { token: 'synthetic-session' };
const encoder = new TextEncoder();

function event(data: object) {
  return 'data: ' + JSON.stringify(data) + '\r\n\r\n';
}

const done = event({
  type: 'response.completed',
  response: {
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '先看看左边有几个。' }],
      },
    ],
    usage: { input_tokens: 82, output_tokens: 12 },
  },
});

function stream(...chunks: Uint8Array[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  );
}

function setup(config = settings) {
  const send = vi.fn<typeof fetch>();
  const authorize = vi.fn<Parameters<typeof createTutoringGateway>[1]>(async (_, start) =>
    start(new AbortController().signal),
  );
  const meter = {
    reserve: vi
      .fn<Parameters<typeof createTutoringGateway>[2]['reserve']>()
      .mockResolvedValue('id'),
    settle: vi.fn<Parameters<typeof createTutoringGateway>[2]['settle']>().mockResolvedValue(),
  };
  return { send, authorize, meter, request: createTutoringGateway(config, authorize, meter, send) };
}

afterEach(() => vi.useRealTimers());

it.each([
  [{ ...settings, paidAiEnabled: false }, 'disabled'],
  [{ ...settings, apiKey: '' }, 'missing-key'],
  [{ ...settings, eligible: false }, 'ineligible'],
] as const)('fails closed with %j', async (config, reason) => {
  const { request, authorize, send } = setup(config);
  await expect(request(credentials, input)).resolves.toEqual({ status: 'fallback', reason });
  expect(authorize).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

it('requires current consent and validates context before contacting the provider', async () => {
  const { request, authorize, send } = setup();
  authorize.mockRejectedValueOnce(new RequestError(403, 'synthetic private error'));
  await expect(request(credentials, input)).resolves.toEqual({
    status: 'fallback',
    reason: 'unauthorized',
  });
  await expect(request(credentials, { ...input, question: 'a'.repeat(501) })).resolves.toEqual({
    status: 'fallback',
    reason: 'invalid-input',
  });
  expect(authorize).toHaveBeenCalledTimes(1);
  expect(send).not.toHaveBeenCalled();
});

it('starts one bounded stateless request and decodes a completion across UTF-8 chunks', async () => {
  const { request, authorize, send } = setup();
  const bytes = encoder.encode(event({ type: 'response.created' }) + done);
  const split = bytes.indexOf(encoder.encode('先')[0]!) + 1;
  send.mockResolvedValue(stream(bytes.slice(0, split), bytes.slice(split)));
  const context = { ...input, history: 'private past answer', answerKey: 'private solution' };
  await expect(request(credentials, context)).resolves.toMatchObject({
    status: 'ready',
    text: '先看看左边有几个。',
    usage: { inputTokens: 82, outputTokens: 12 },
  });
  expect(authorize).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledExactlyOnceWith(
    'https://api.openai.com/v1/responses',
    expect.objectContaining({ redirect: 'error' }),
  );
  const init = send.mock.calls[0]?.[1];
  expect(init?.headers).toMatchObject({ authorization: 'Bearer synthetic-key' });
  expect(JSON.parse(String(init?.body))).toMatchObject({
    model: 'gpt-6-luna',
    stream: true,
    store: false,
    reasoning: { effort: 'none' },
    max_output_tokens: 128,
    service_tier: 'default',
    input: [{ role: 'user', content: JSON.stringify(input) }],
  });
  expect(init?.body).not.toContain(credentials.token);
  expect(init?.body).not.toContain('private');
});

it('times out despite early headers, deltas and a stream that stays open', async () => {
  vi.useFakeTimers();
  const { request, send, meter } = setup();
  send.mockImplementation(async (_, options) => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(event({ type: 'response.output_text.delta', delta: '先' })),
        );
        options?.signal?.addEventListener('abort', () => controller.error(new Error('aborted')));
      },
    });
    return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
  });
  const pending = request(credentials, input);
  await vi.advanceTimersByTimeAsync(10_000);
  await expect(pending).resolves.toEqual({ status: 'fallback', reason: 'timeout' });
  expect(send.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(send).toHaveBeenCalledTimes(1);
  expect(meter.settle).toHaveBeenCalledExactlyOnceWith('id', { status: 'unknown' });
});

it('cancels pending authorization and does not send when it eventually returns', async () => {
  const { request, send, authorize, meter } = setup();
  const controller = new AbortController();
  let release = () => {};
  authorize.mockImplementation(async (_, start) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return start(new AbortController().signal);
  });
  const pending = request(credentials, input, controller.signal);
  await Promise.resolve();
  controller.abort('synthetic private error');
  await expect(pending).resolves.toEqual({ status: 'fallback', reason: 'cancelled' });
  release();
  await vi.waitFor(() =>
    expect(meter.settle).toHaveBeenCalledExactlyOnceWith('id', { status: 'released' }),
  );
  expect(send).not.toHaveBeenCalled();
});

it('falls back at admission without dispatching or settling', async () => {
  const { request, send, meter } = setup();
  meter.reserve.mockResolvedValueOnce(null);
  await expect(request(credentials, input)).resolves.toMatchObject({ reason: 'usage-limited' });
  expect(send).not.toHaveBeenCalled();
  expect(meter.settle).not.toHaveBeenCalled();
});

it('settles reported usage for unusable hints and flags out-of-bounds responses', async () => {
  const { request, send, meter } = setup();
  send.mockResolvedValueOnce(stream(encoder.encode(done.replace('output_text', 'refusal'))));
  await expect(request(credentials, input)).resolves.toMatchObject({ reason: 'unavailable' });
  expect(meter.settle).toHaveBeenNthCalledWith(1, 'id', {
    status: 'settled',
    usage: { inputTokens: 82, outputTokens: 12 },
  });
  send.mockResolvedValueOnce(
    stream(encoder.encode(done.replace('"output_tokens":12', '"output_tokens":129'))),
  );
  await expect(request(credentials, input)).resolves.toMatchObject({ reason: 'unavailable' });
  expect(meter.settle).toHaveBeenNthCalledWith(2, 'id', {
    status: 'out-of-bounds',
    usage: { inputTokens: 82, outputTokens: 129 },
  });
});

it.each([
  'data: broken\n\n',
  event({ type: 'response.failed', secret: 'private provider error' }),
  event({ type: 'response.output_text.delta', delta: 'incomplete' }),
  done.replace('output_text', 'refusal'),
  done.replace('先看看左边有几个。', ' '.repeat(10)),
  done.replace('先看看左边有几个。', '答'.repeat(161)),
  ' '.repeat(65_537),
])('discards failed, incomplete and malformed streams', async (payload) => {
  const { request, send } = setup();
  send.mockResolvedValue(stream(encoder.encode(payload)));
  await expect(request(credentials, input)).resolves.toEqual({
    status: 'fallback',
    reason: 'unavailable',
  });
  expect(send).toHaveBeenCalledTimes(1);
});
