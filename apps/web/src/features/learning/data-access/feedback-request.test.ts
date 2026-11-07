import { afterEach, expect, it, vi } from 'vitest';
import { requestTeachingFeedback } from './feedback-request';

const scope = { id: 'count-dots', version: 1, csrf: 'session-token' };
const ready = {
  status: 'ready',
  source: 'ai',
  feedback: { status: 'needs-work', instruction: '再数一数。', stepId: 'count-left' },
};
afterEach(() => vi.unstubAllGlobals());

it('posts the step, the text and the image as base64 with the session headers', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(ready));
  vi.stubGlobal('fetch', fetch);
  const image = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
  await expect(
    requestTeachingFeedback(scope, { stepId: 'count-left', text: '三个', image }),
  ).resolves.toEqual(ready);
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe('/api/v1/problems/count-dots/1/feedback');
  expect(init).toMatchObject({
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-CSRF-Token': 'session-token', 'X-Education-Request': 'session' },
  });
  expect(JSON.parse(init.body)).toEqual({ stepId: 'count-left', text: '三个', image: 'iVBORw==' });
});

it('encodes images larger than one chunk', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(ready));
  vi.stubGlobal('fetch', fetch);
  const bytes = new Uint8Array(0x8000 * 2 + 5).fill(65);
  await requestTeachingFeedback(scope, { stepId: 'count-left', image: new Blob([bytes]) });
  const { image } = JSON.parse(fetch.mock.calls[0]![1].body);
  expect(atob(image)).toBe('A'.repeat(bytes.length));
});

it.each([
  ['nothing to send', { stepId: 'count-left' }],
  ['text that is too long', { stepId: 'count-left', text: '答'.repeat(501) }],
  ['an empty text', { stepId: 'count-left', text: '' }],
  ['a bad step name', { stepId: 'Count Left', text: '三个' }],
  ['an oversized image', { stepId: 'count-left', image: new Blob([new Uint8Array(600_000)]) }],
])('does not send %s', async (_name, submission) => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(requestTeachingFeedback(scope, submission)).resolves.toEqual({
    status: 'fallback',
    reason: 'invalid-input',
  });
  expect(fetch).not.toHaveBeenCalled();
});

it('returns server fallbacks and rejects unreadable or failed replies', async () => {
  const fallback = { status: 'fallback', reason: 'usage-limited' };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json(fallback))
    .mockResolvedValueOnce(Response.json({ ...ready, extra: '<script>' }))
    .mockResolvedValueOnce(
      Response.json({ ...ready, feedback: { ...ready.feedback, stepId: 'X' } }),
    )
    .mockResolvedValueOnce(Response.json({ message: 'private' }, { status: 503 }));
  vi.stubGlobal('fetch', fetch);
  const submission = { stepId: 'count-left', text: '三个' };
  await expect(requestTeachingFeedback(scope, submission)).resolves.toEqual(fallback);
  await expect(requestTeachingFeedback(scope, submission)).rejects.toThrow();
  await expect(requestTeachingFeedback(scope, submission)).rejects.toThrow();
  await expect(requestTeachingFeedback(scope, submission)).rejects.toThrow('暂时连不上');
});

it('stops when the caller cancels', async () => {
  const controller = new AbortController();
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
      });
    }),
  );
  const pending = requestTeachingFeedback(
    scope,
    { stepId: 'count-left', text: '三个' },
    controller.signal,
  );
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  controller.abort();
  await expect(pending).rejects.toThrow();
});
