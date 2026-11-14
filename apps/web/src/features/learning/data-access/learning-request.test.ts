import { afterEach, expect, it, vi } from 'vitest';
import { requestLearning } from './learning-request';

afterEach(() => vi.unstubAllGlobals());

const scope = (refused: () => void) => ({
  id: 'garden-balance',
  version: 1,
  csrf: 'c'.repeat(43),
  refused,
});

function reply(response: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  );
}

it('tells the page when the server refuses the problem for a reason', async () => {
  const refused = vi.fn();
  reply(Response.json({ message: '这本书暂时不可用。', reason: 'unavailable' }, { status: 403 }));
  const response = await requestLearning(scope(refused), 'draft');
  expect(refused).toHaveBeenCalledOnce();
  expect(await response.json()).toMatchObject({ reason: 'unavailable' });
});

it('leaves a stale token and every other reply to the request that made it', async () => {
  const refused = vi.fn();
  reply(Response.json({ message: '请刷新页面后重试。' }, { status: 403 }));
  await requestLearning(scope(refused), 'answer');
  reply(Response.json({ draft: null }));
  await requestLearning(scope(refused), 'draft');
  reply(new Response('not json', { status: 403 }));
  await requestLearning(scope(refused), 'draft');
  expect(refused).not.toHaveBeenCalled();
});
