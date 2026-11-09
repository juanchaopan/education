import type { AiConsentView } from '@education/contracts';
import { expect, it } from 'vitest';
import { consentBadge } from './consent-badge';

type Policy = AiConsentView['policies'][number];
const policy = (
  state: Policy['state'],
  availability: Policy['availability'] = 'ready',
): Policy => ({
  scope: 'openai-tutoring',
  policyVersion: 1,
  title: 'AI 解题提示',
  provider: 'OpenAI',
  inputs: '',
  purpose: '',
  appRetention: '',
  providerRetention: '',
  revision: null,
  state,
  availability,
});
const badge = (...policies: Policy[]) =>
  consentBadge({ reauthenticationRequired: false, tutoringBudget: 'unset', policies }).text;

it('says nothing is sent while no service is switched on, whatever was granted', () => {
  expect(badge(policy('granted', 'unavailable'), policy('granted', 'unavailable'))).toBe(
    '暂未启用',
  );
});

it('asks for consent again once a policy has changed', () => {
  expect(badge(policy('granted'), policy('policy-changed'))).toBe('需重新授权');
});

it('tells all, some and none granted apart, a withdrawn consent counting as none', () => {
  expect(badge(policy('granted'), policy('granted'))).toBe('已授权');
  expect(badge(policy('granted'), policy('revoked'))).toBe('部分授权');
  expect(badge(policy('ungranted'), policy('revoked'))).toBe('未授权');
});
