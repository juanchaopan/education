import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LearningRange } from '@education/contracts';
import { renderFamilyPage } from '../../../test/family-page';

const mi = '11111111-1111-4111-8111-111111111111';
const le = '22222222-2222-4222-8222-222222222222';
const session = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: 'a'.repeat(43),
};
const range = (from: string, to: string): LearningRange => ({
  from,
  to,
  seconds: 720,
  problems: { independent: 1, assisted: 0, open: 1 },
  items: [
    {
      id: 'fixture-one',
      version: 1,
      title: '一棵青菜',
      state: 'independent',
      attempts: 2,
      hints: 0,
    },
    { id: 'fixture-two', version: 1, title: null, state: 'open', attempts: 3, hints: 2 },
  ],
  total: { problems: 38, seconds: 22_800 },
});

// The family's replies by path, the record of whichever days are asked for.
function stubFamily() {
  const fetcher = vi.fn(async (url: string) => {
    const [path, query] = url.replace('/api/v1/', '').split('?');
    const days = new URLSearchParams(query);
    if (path === 'session') return Response.json(session);
    if (path === 'parents/family/time-zone')
      return Response.json({ timeZone: 'Asia/Shanghai', set: true });
    if (path === 'parents/children')
      return Response.json({
        reauthenticationRequired: false,
        children: [
          { id: mi, nickname: '小米', credentialVersion: 1 },
          { id: le, nickname: '乐乐', credentialVersion: 1 },
        ],
      });
    if (path?.endsWith('/learning'))
      return Response.json(range(days.get('from')!, days.get('to')!));
    if (path?.endsWith('/learning-summary'))
      return Response.json({ childId: path.split('/')[2], hasMore: false, problems: [] });
    return Response.json({}, { status: 503 });
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-12T12:15:00Z'), toFake: ['Date'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const asked = (fetcher: ReturnType<typeof stubFamily>) =>
  fetcher.mock.calls.map(([url]) => url).filter((url) => url.includes('/learning?'));

it('opens on the day the overview picked, with its problems and the whole record', async () => {
  const fetcher = stubFamily();
  renderFamilyPage(`/family/learning?child=${le}&from=2026-11-12&to=2026-11-12`);
  const day = await screen.findByRole('region', { name: '2026年11月12日 周四' });
  expect(screen.getByRole('radio', { name: '乐乐' })).toBeChecked();
  expect(await within(day).findByText('一棵青菜')).toBeVisible();
  expect(day).toHaveTextContent('已学 12 分钟');
  expect(day).toHaveTextContent('2 道题：独立完成 1 道还没做出来 1 道');
  expect(
    within(day)
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual([
    '一棵青菜作答 2 次 · 提示 0 次独立完成',
    'fixture-two作答 3 次 · 提示 2 次还没做出来',
  ]);
  expect(screen.getByRole('region', { name: '学习摘要' })).toHaveTextContent(
    '一共做过 38 道题 · 学了 6 小时 20 分',
  );
  expect(asked(fetcher)).toEqual([
    `/api/v1/parents/children/${le}/learning?from=2026-11-12&to=2026-11-12`,
  ]);
});

it('widens one day to the seven days ending on it', async () => {
  const fetcher = stubFamily();
  renderFamilyPage(`/family/learning?child=${mi}&from=2026-11-10&to=2026-11-10`);
  await screen.findByRole('region', { name: '2026年11月10日 周二' });
  vi.useRealTimers();
  await userEvent.click(screen.getByRole('button', { name: '看这 7 天' }));
  expect(await screen.findByRole('region', { name: '11月4日 – 11月10日' })).toBeVisible();
  expect(screen.queryByRole('button', { name: '看这 7 天' })).toBeNull();
  expect(asked(fetcher).at(-1)).toBe(
    `/api/v1/parents/children/${mi}/learning?from=2026-11-04&to=2026-11-10`,
  );
});

it("opens on today and the six days before it, in the family's time zone, without days given", async () => {
  const fetcher = stubFamily();
  renderFamilyPage('/family/learning');
  expect(await screen.findByRole('region', { name: '11月6日 – 今天' })).toBeVisible();
  expect(screen.getByRole('radio', { name: '小米' })).toBeChecked();
  expect(asked(fetcher)).toEqual([
    `/api/v1/parents/children/${mi}/learning?from=2026-11-06&to=2026-11-12`,
  ]);
});

it('keeps the days when another child is picked', async () => {
  const fetcher = stubFamily();
  renderFamilyPage(`/family/learning?child=${mi}&from=2026-11-08&to=2026-11-09`);
  await screen.findByRole('region', { name: '11月8日 – 11月9日' });
  vi.useRealTimers();
  await userEvent.click(screen.getByRole('radio', { name: '乐乐' }));
  await vi.waitFor(() =>
    expect(asked(fetcher).at(-1)).toBe(
      `/api/v1/parents/children/${le}/learning?from=2026-11-08&to=2026-11-09`,
    ),
  );
});
