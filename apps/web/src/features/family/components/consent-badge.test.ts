import { expect, it } from 'vitest';
import { consentPolicy, consentView, type ConsentPolicy } from '../../../test/consent-policy';
import { consentBadge } from './consent-badge';

const policy = (
  state: ConsentPolicy['state'],
  availability: ConsentPolicy['availability'] = 'ready',
) => consentPolicy({ state, availability });
const badge = (...policies: ConsentPolicy[]) => consentBadge(consentView(...policies)).text;

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
