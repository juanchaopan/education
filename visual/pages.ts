import { expect, type Page } from '@playwright/test';
import { serveApi, signedOutApi, unverifiedParentApi, type Api } from './api';
import { xiaomi } from './bookshelf';
import {
  childHomeApi,
  gardenLessonApi,
  going,
  noBooksApi,
  unavailable,
  unavailableBooksApi,
} from './child-home';
import {
  childShelfApi,
  emptyParentSpaceApi,
  familyShelfApi,
  libraryApi,
  parentSpaceApi,
  recordedChild,
  screenshotDay,
} from './parent-space';
import { fixClock, waitForPicturesAndFonts, type Theme } from './render';

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

const dayStates: PageState[] = [
  { name: 'home-sign-in', path: '/', ready: '登录', pressable: '进入我的空间' },
  { name: 'home-sign-in-parent', path: '/?tab=parent', ready: '登录', pressable: '登录' },
  { name: 'child-home', path: '/', ready: '我的书', last: '思维训练', api: childHomeApi },
  {
    name: 'child-home-open',
    path: `/?open=${going.id}`,
    ready: '我的书',
    last: '排队的小鸭子',
    api: childHomeApi,
  },
  {
    name: 'child-home-unavailable',
    path: `/?books=unavailable&open=${unavailable.id}`,
    ready: '我的书',
    last: '儿歌和童谣',
    api: unavailableBooksApi,
  },
  {
    name: 'child-home-loading',
    path: '/',
    ready: '我的书',
    api: { ...childHomeApi, 'GET /api/v1/children/assignments': 'pending' },
  },
  {
    name: 'child-home-failed',
    path: '/',
    ready: '我的书没打开',
    api: { ...childHomeApi, 'GET /api/v1/children/assignments': failed },
  },
  { name: 'child-home-empty', path: '/', ready: '家长还没有给你安排书', api: noBooksApi },
  {
    name: 'problem-guest',
    path: '/problems/garden-balance/1',
    ready: '登录后才能打开这道题',
  },
  {
    name: 'problem-unavailable',
    path: '/problems/visual-fixture-missing',
    ready: '这道题暂时不可用',
    api: gardenLessonApi,
  },
  {
    name: 'lesson-title-card',
    path: '/problems/garden-balance/1',
    ready: '一棵青菜有多重？',
    pressable: '开始短片',
    api: gardenLessonApi,
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
    last: '自然拼读',
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
    name: 'family-profile',
    path: '/family/profile',
    ready: '孩子登录管理',
    last: '每天的学习从这个时区的 0 点算起，家里每个人的页面也按它的时间换白天和晚上的样子。',
    api: parentSpaceApi,
  },
  {
    name: 'family-practice',
    path: '/family/practice',
    ready: '练习安排',
    last: '一共 6 本，都在这里了',
    api: libraryApi,
  },
  {
    name: 'family-practice-family',
    path: '/family/practice?shelf=family',
    ready: '练习安排',
    last: '一共 5 本，都在这里了',
    api: familyShelfApi,
  },
  {
    name: 'family-practice-child',
    path: `/family/practice?child=${xiaomi}`,
    ready: '练习安排',
    last: '一共 11 本，都在这里了',
    api: childShelfApi,
  },
  {
    name: 'family-practice-loading',
    path: '/family/practice',
    ready: '练习安排',
    api: { ...libraryApi, 'GET /api/v1/parents/books': 'pending' },
  },
  {
    name: 'family-practice-failed',
    path: '/family/practice',
    ready: '书架没打开',
    api: { ...libraryApi, 'GET /api/v1/parents/books': failed },
  },
  {
    name: 'family-practice-no-children',
    path: '/family/practice',
    ready: '练习安排',
    last: '一共 6 本，都在这里了',
    api: {
      ...libraryApi,
      'GET /api/v1/parents/children': emptyParentSpaceApi['GET /api/v1/parents/children']!,
    },
  },
  {
    name: 'family-learning',
    path: `/family/learning?child=${recordedChild}&from=${screenshotDay}&to=${screenshotDay}`,
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
  { name: 'child-registration', path: '/join', ready: '加入我的家庭' },
  { name: 'parent-recovery', path: '/family/recover', ready: '找回家长密码' },
  { name: 'password-reset-without-link', path: '/family/reset', ready: '请从恢复邮件打开' },
  { name: 'email-verification-without-link', path: '/family/verify', ready: '验证家长邮箱' },
  { name: 'not-found', path: '/visual-fixture-missing-page', ready: '这条小路还没找到' },
];

// The key pages are also seen in the night theme: the sign-in, the child's
// home, the parent's sign-up, the parent space's overview, family page and
// bookshelf, a lesson's title card and the page for a path that leads
// nowhere.
const nightPages = [
  'home-sign-in',
  'child-home',
  'family-signed-out',
  'family-overview',
  'family-profile',
  'family-practice',
  'family-practice-family',
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
  await waitForPicturesAndFonts(page);
  return unexpected;
}
