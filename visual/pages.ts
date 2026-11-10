import { expect, type Page } from '@playwright/test';
import type { ProblemSummary } from '@education/contracts';
import { longCatalog, serveApi, signedOutApi, unverifiedParentApi, type Api } from './api';
import { emptyParentSpaceApi, parentSpaceApi, recordedChild } from './parent-space';
import { fixClock, waitForFonts, type Theme } from './render';

// One page in one state: where to open it, how the API answers, the heading
// that shows it has finished rendering that state, a button that must also be
// ready to press, and the theme it is seen in (the day theme unless named). A
// page that fills in after its heading names the text it shows last, once
// everything has arrived.
export type PageState = {
  name: string;
  path: string;
  ready: string;
  pressable?: string;
  last?: string;
  api?: Api;
  theme?: Theme;
};

const failed = { status: 500, json: { message: 'unavailable' } };

// The garden lesson as the catalog lists it, opened by a visitor.
const garden: ProblemSummary = {
  id: 'garden-balance',
  version: 1,
  title: '一棵青菜有多重',
  grade: '一年级',
  subject: '数学',
  category: '学而思',
  sequence: 1,
};

const dayStates: PageState[] = [
  { name: 'explore-empty', path: '/', ready: '好问题，正在准备中' },
  {
    name: 'explore-loading',
    path: '/',
    ready: '正在打开探索地图',
    api: { 'GET /api/v1/problems': 'pending' },
  },
  {
    name: 'explore-failed',
    path: '/',
    ready: '刚才没能打开',
    api: { 'GET /api/v1/problems': failed },
  },
  {
    name: 'explore-long-text',
    path: '/',
    ready: '从一个好问题开始',
    api: { 'GET /api/v1/problems': { status: 200, json: longCatalog } },
  },
  {
    name: 'problem-unavailable',
    path: '/problems/visual-fixture-missing',
    ready: '这道题暂时不可用',
  },
  {
    name: 'lesson-title-card',
    path: '/problems/garden-balance/1',
    ready: '一棵青菜有多重？',
    pressable: '开始短片',
    api: { 'GET /api/v1/problems/garden-balance/1': { status: 200, json: garden } },
  },
  { name: 'family-signed-out', path: '/family', ready: '创建家长账号' },
  {
    name: 'family-session-failed',
    path: '/family',
    ready: '创建家长账号',
    api: { 'GET /api/v1/session': failed },
  },
  {
    name: 'family-registration-closed',
    path: '/family',
    ready: '创建家长账号',
    api: { 'GET /api/v1/registration-status': { status: 200, json: { enabled: false } } },
  },
  {
    name: 'family-unverified',
    path: '/family',
    ready: '验证家长邮箱',
    last: '邮件服务商已接受请求，请查看收件箱和垃圾箱。',
    api: unverifiedParentApi,
  },
  {
    name: 'family-overview',
    path: '/family',
    ready: '总览',
    last: '测试用的第三道题',
    api: parentSpaceApi,
  },
  {
    name: 'family-overview-empty',
    path: '/family',
    ready: '还没有孩子',
    last: '暂未启用',
    api: emptyParentSpaceApi,
  },
  {
    name: 'family-children',
    path: '/family/children',
    ready: '孩子登录管理',
    last: '一个很长很长的昵称乐乐',
    api: parentSpaceApi,
  },
  {
    name: 'family-practice',
    path: '/family/practice',
    ready: '安排练习',
    last: '为哪位孩子安排',
    api: parentSpaceApi,
  },
  {
    name: 'family-learning',
    path: `/family/learning?child=${recordedChild}`,
    ready: '学习摘要',
    last: '测试用的第二道题',
    api: parentSpaceApi,
  },
  {
    name: 'family-privacy',
    path: '/family/privacy',
    ready: '外部 AI 授权',
    last: '语音转写',
    api: parentSpaceApi,
  },
  { name: 'child-signed-out', path: '/child', ready: '孩子登录' },
  { name: 'child-registration', path: '/join', ready: '加入我的家庭' },
  { name: 'parent-recovery', path: '/family/recover', ready: '找回家长密码' },
  { name: 'password-reset-without-link', path: '/family/reset', ready: '请从恢复邮件打开' },
  { name: 'email-verification-without-link', path: '/family/verify', ready: '验证家长邮箱' },
  { name: 'not-found', path: '/visual-fixture-missing-page', ready: '这条小路还没找到' },
];

// The key pages are also seen in the night theme: the catalogue, the child's
// and the parent's sign-in, the parent space's overview, a lesson's title
// card and the page for a path that leads nowhere.
const nightPages = [
  'explore-empty',
  'child-signed-out',
  'family-signed-out',
  'family-overview',
  'lesson-title-card',
  'not-found',
];
const nightStates = dayStates
  .filter((state) => nightPages.includes(state.name))
  .map((state): PageState => ({ ...state, name: `${state.name}-night`, theme: 'night' }));

export const pageStates = [...dayStates, ...nightStates];

// Opens a page state with a fixed clock and API, and waits until it, the
// pictures it loads straight away and its fonts have rendered. Returns the
// API requests the state did not plan for.
export async function openPageState(page: Page, state: PageState) {
  await fixClock(page, state.theme);
  const unexpected = await serveApi(page, { ...signedOutApi, ...state.api });
  await page.goto(state.path);
  await expect(page.getByRole('heading', { name: state.ready })).toBeVisible();
  if (state.pressable)
    await expect(page.getByRole('button', { name: state.pressable })).toBeEnabled({
      timeout: 30_000,
    });
  if (state.last) await expect(page.getByText(state.last, { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', state.theme ?? 'day');
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete || image.loading === 'lazy'),
  );
  await waitForFonts(page);
  return unexpected;
}
