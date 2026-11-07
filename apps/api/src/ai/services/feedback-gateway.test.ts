import { expect, it } from 'vitest';
import { reservationCostFor } from '../domain/tutoring-cost.js';
import { completion, credentials, encoder, setupGateway, stream } from './gateway-fixtures.js';
import { feedbackTask, type FeedbackModelInput } from './feedback-task.js';

const reply = {
  status: 'needs-work',
  instruction: '再数一数框里的点。',
  confidence: 0.9,
  injection: false,
  highlight: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
};
const input = { prompt: '数一数左边的点。', text: '我数了三个' };

function setup() {
  const { gateway, ...rest } = setupGateway();
  const request = (context: FeedbackModelInput = input) =>
    gateway(feedbackTask, credentials, context);
  return { ...rest, request };
}

function reply200(text: string, usage?: { input_tokens: number; output_tokens: number }) {
  return stream(encoder.encode(completion(text, usage)));
}

it('requests strict structured output, reserves its larger output and returns the parsed reply', async () => {
  const { request, send, meter } = setup();
  send.mockResolvedValue(
    reply200(JSON.stringify(reply), { input_tokens: 900, output_tokens: 140 }),
  );
  await expect(request()).resolves.toMatchObject({
    status: 'ready',
    value: reply,
    usage: { inputTokens: 900, outputTokens: 140 },
  });
  expect(meter.reserve).toHaveBeenCalledWith(credentials, reservationCostFor(256));
  expect(meter.settle).toHaveBeenCalledWith('id', {
    status: 'settled',
    usage: { inputTokens: 900, outputTokens: 140 },
  });
  expect(JSON.parse(String(send.mock.calls[0]?.[1]?.body))).toMatchObject({
    max_output_tokens: 256,
    store: false,
    text: { format: { type: 'json_schema', strict: true, name: 'teaching_feedback' } },
    input: [{ role: 'user', content: [{ type: 'input_text' }] }],
  });
});

it('does not count image data against the text bound but still bounds the text', async () => {
  const { request, send } = setup();
  send.mockResolvedValue(reply200(JSON.stringify(reply)));
  const imageUrl = `data:image/png;base64,${'A'.repeat(600_000)}`;
  await expect(request({ ...input, imageUrl })).resolves.toMatchObject({ status: 'ready' });
  const body = JSON.parse(String(send.mock.calls[0]?.[1]?.body));
  expect(body.input[0].content[1]).toEqual({
    type: 'input_image',
    image_url: imageUrl,
    detail: 'low',
  });
  await expect(request({ ...input, text: '答'.repeat(501), imageUrl })).resolves.toEqual({
    status: 'fallback',
    reason: 'invalid-input',
  });
  expect(send).toHaveBeenCalledTimes(1);
});

it('bounds output at the feedback limit and refuses malformed or unsafe replies', async () => {
  const { request, send, meter } = setup();
  send.mockResolvedValueOnce(
    reply200(JSON.stringify(reply), { input_tokens: 90, output_tokens: 257 }),
  );
  await expect(request()).resolves.toMatchObject({ reason: 'unavailable' });
  expect(meter.settle).toHaveBeenLastCalledWith('id', {
    status: 'out-of-bounds',
    usage: { inputTokens: 90, outputTokens: 257 },
  });
  for (const text of ['好的，你画得很棒', JSON.stringify({ ...reply, instruction: '<b>看</b>' })]) {
    send.mockResolvedValueOnce(reply200(text));
    await expect(request()).resolves.toEqual({ status: 'fallback', reason: 'unavailable' });
  }
  expect(meter.settle).toHaveBeenLastCalledWith('id', {
    status: 'settled',
    usage: { inputTokens: 82, outputTokens: 12 },
  });
});
