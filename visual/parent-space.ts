import type {
  AiConsentView,
  FamilyChildren,
  LearningSummary,
  ParentSession,
  PracticePage,
  ProblemLearningSummary,
  RegistrationKeyStatus,
} from '@education/contracts';
import type { Api } from './api';

// A verified parent's family for the parent space screenshots. Test fixtures
// only: the problems and the long nickname never enter the problem list.
const xiaomi = '11111111-1111-4111-8111-111111111111';
const lele = '22222222-2222-4222-8222-222222222222';
const ok = <T>(json: T) => ({ status: 200, json });

const session: ParentSession = {
  role: 'parent',
  email: 'a-long-synthetic-family-email-address@example.test',
  emailVerified: true,
  access: 'verified',
  csrfToken: 'a'.repeat(43),
};
const problem = (
  id: string,
  title: string,
  counts: Partial<ProblemLearningSummary>,
): ProblemLearningSummary => ({
  id,
  version: 1,
  title,
  independent: 0,
  assisted: 0,
  incorrect: 0,
  uncertain: 0,
  hints: 0,
  reviewSuggested: false,
  ...counts,
});
const policy = (
  scope: AiConsentView['policies'][number]['scope'],
  title: string,
): AiConsentView['policies'][number] => ({
  scope,
  policyVersion: 1,
  title,
  provider: 'OpenAI',
  inputs: '孩子提交的问题',
  purpose: '给出下一步提示',
  appRetention: '不保存原文',
  providerRetention: '按供应商的政策保留',
  revision: null,
  state: 'ungranted',
  availability: 'unavailable',
});

const signedIn: Api = {
  'GET /api/v1/session': ok(session),
  'GET /api/v1/parents/ai-consent': ok<AiConsentView>({
    reauthenticationRequired: false,
    tutoringBudget: 'unset',
    policies: [
      policy('openai-tutoring', 'AI 解题提示'),
      policy('openai-transcription', '语音转写'),
    ],
  }),
};

// Two children: one with a record, a problem worth another try and nothing
// planned; one with a long nickname, no record and one planned problem.
export const parentSpaceApi: Api = {
  ...signedIn,
  'GET /api/v1/parents/registration-keys': ok<RegistrationKeyStatus>({
    key: null,
    reauthenticationRequired: false,
    familyCode: 'K7M4-Q2AB-CDEF',
  }),
  'GET /api/v1/parents/children': ok<FamilyChildren>({
    reauthenticationRequired: false,
    children: [
      { id: xiaomi, nickname: '小米', credentialVersion: 1 },
      { id: lele, nickname: '一个很长很长的昵称乐乐', credentialVersion: 1 },
    ],
  }),
  [`GET /api/v1/parents/children/${xiaomi}/learning-summary`]: ok<LearningSummary>({
    childId: xiaomi,
    hasMore: false,
    problems: [
      problem('visual-fixture-one', '测试用的第一道题', { independent: 2, assisted: 1, hints: 2 }),
      problem('visual-fixture-two', '测试用的第二道题', { incorrect: 1, reviewSuggested: true }),
    ],
  }),
  [`GET /api/v1/parents/children/${lele}/learning-summary`]: ok<LearningSummary>({
    childId: lele,
    hasMore: false,
    problems: [],
  }),
  [`GET /api/v1/parents/children/${xiaomi}/practice`]: ok<PracticePage>({
    hasMore: false,
    problems: [],
  }),
  [`GET /api/v1/parents/children/${lele}/practice`]: ok<PracticePage>({
    hasMore: false,
    problems: [{ id: 'visual-fixture-three', version: 1, title: '测试用的第三道题' }],
  }),
};

// A family whose first child has not joined yet: no children and no code.
export const emptyParentSpaceApi: Api = {
  ...signedIn,
  'GET /api/v1/parents/registration-keys': ok<RegistrationKeyStatus>({
    key: null,
    reauthenticationRequired: false,
  }),
  'GET /api/v1/parents/children': ok<FamilyChildren>({
    reauthenticationRequired: false,
    children: [],
  }),
};
