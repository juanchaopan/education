import { expect, it } from 'vitest';
import { admissionPolicy, childAccountBudget, childIdentity } from './admission-policy.js';

const attempt = { identity: 'a@example.test', source: '203.0.113.7' };

it('counts only failed parent sign-ins, by source and by email, apart from registration', () => {
  expect(admissionPolicy('parent-login', attempt)).toEqual({
    counts: 'failures',
    account: 'parent-login:email:a@example.test',
    budgets: [
      { name: 'parent-login:ip:203.0.113.7', recent: 30, daily: 200 },
      { name: 'parent-login:email:a@example.test', recent: 10, daily: 50 },
    ],
  });
  expect(admissionPolicy('authentication', attempt)).toEqual({
    counts: 'every-attempt',
    budgets: [
      { name: 'authentication', recent: 100, daily: 500 },
      { name: 'ip:203.0.113.7', recent: 30, daily: 200 },
      { name: 'email:a@example.test', recent: 10, daily: 50 },
    ],
  });
});

it('counts only failed child sign-ins, by source, family and child account, with no site-wide limit', () => {
  const identity = childIdentity('ABCDEFGHJKMN', '小鹿');
  expect(childAccountBudget(identity)).toBe('child:["ABCDEFGHJKMN","小鹿"]');
  expect(
    admissionPolicy('child-login', { identity, source: 'source', family: 'ABCDEFGHJKMN' }),
  ).toEqual({
    counts: 'failures',
    account: childAccountBudget(identity),
    budgets: [
      { name: 'child-login:ip:source', recent: 30, daily: 200 },
      { name: 'family:ABCDEFGHJKMN', recent: 50, daily: 200 },
      { name: childAccountBudget(identity), recent: 5, daily: 20 },
    ],
  });
});

it('keeps recovery, PIN reset and KEY redemption counting every attempt in budgets of their own', () => {
  const names = (scope: 'recovery' | 'child-reset') =>
    admissionPolicy(scope, attempt).budgets.map(({ name }) => name);
  expect(names('recovery')).toEqual([
    'recovery:authentication',
    'recovery:ip:203.0.113.7',
    'recovery:email:a@example.test',
  ]);
  expect(names('child-reset')).toEqual([
    'child-reset:authentication',
    'child-reset:ip:203.0.113.7',
    'child-reset:email:a@example.test',
  ]);
  expect(admissionPolicy('child-registration', { identity: 'KEY', source: 's' })).toEqual({
    counts: 'every-attempt',
    budgets: [
      { name: 'child-registration:authentication', recent: 100, daily: 500 },
      { name: 'child-registration:ip:s', recent: 10, daily: 50 },
      { name: 'child-registration:key:KEY', recent: 5, daily: 500 },
    ],
  });
});

it('names no account budget for an attempt that names no account', () => {
  expect(admissionPolicy('authentication', { identity: '', source: 's' }).budgets).toHaveLength(2);
  expect(admissionPolicy('child-login', { identity: '', source: 's' })).toEqual({
    counts: 'failures',
    budgets: [{ name: 'child-login:ip:s', recent: 30, daily: 200 }],
  });
  expect(admissionPolicy('parent-login', { identity: '', source: 's' }).account).toBeUndefined();
});
