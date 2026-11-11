import { afterEach, expect, it, vi } from 'vitest';
import { requestTeacherReply } from './question-request';

const scope = { id: 'garden-balance', version: 1, csrf: 'session-token' };
const ready = { status: 'ready', source: 'ai', reply: '篮子在天平旁边。' };
const question = { stepId: 'leaves', text: '篮子在哪里？' };
afterEach(() => vi.unstubAllGlobals());

it('posts the scene and the question with the session headers', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(ready));
  vi.stubGlobal('fetch', fetch);
  await expect(requestTeacherReply(scope, question)).resolves.toEqual(ready);
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe('/api/v1/problems/garden-balance/1/question');
  expect(init).toMatchObject({
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-CSRF-Token': 'session-token', 'X-Education-Request': 'session' },
  });
  expect(JSON.parse(init.body)).toEqual(question);
});

it('sends only the scene and the question, whatever else the caller holds', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(ready));
  vi.stubGlobal('fetch', fetch);
  await requestTeacherReply(scope, { ...question, childId: 'other' } as typeof question);
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual(question);
});

it.each([
  ['an empty question', { stepId: 'leaves', text: '' }],
  ['too long a question', { stepId: 'leaves', text: '问'.repeat(501) }],
  ['a bad step name', { stepId: 'Leaves', text: '为什么？' }],
])('does not send %s', async (_name, invalid) => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(requestTeacherReply(scope, invalid)).resolves.toEqual({
    status: 'fallback',
    reason: 'invalid-input',
  });
  expect(fetch).not.toHaveBeenCalled();
});

it('returns server fallbacks and rejects replies that judge, point or failed', async () => {
  const fallback = { status: 'fallback', reason: 'usage-limited' };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json(fallback))
    .mockResolvedValueOnce(Response.json({ ...ready, status: 'correct' }))
    .mockResolvedValueOnce(Response.json({ ...ready, highlight: { x: 0, y: 0, width: 1 } }))
    .mockResolvedValueOnce(Response.json({ message: 'private' }, { status: 503 }));
  vi.stubGlobal('fetch', fetch);
  await expect(requestTeacherReply(scope, question)).resolves.toEqual(fallback);
  await expect(requestTeacherReply(scope, question)).rejects.toThrow();
  await expect(requestTeacherReply(scope, question)).rejects.toThrow();
  await expect(requestTeacherReply(scope, question)).rejects.toThrow('暂时连不上');
});
