import { expect, it } from 'vitest';
import { admissionBudgets, childAccountBudget, childIdentity } from './admission-policy.js';

const attempt = { identity: 'a@example.test', source: '203.0.113.7' };

it('gives parent sign-in the budgets of the other authentication requests', () => {
  expect(admissionBudgets('parent-login', attempt)).toEqual(
    admissionBudgets('authentication', attempt),
  );
  expect(admissionBudgets('authentication', attempt)).toEqual([
    { name: 'authentication', recent: 100, daily: 500 },
    { name: 'ip:203.0.113.7', recent: 30, daily: 200 },
    { name: 'email:a@example.test', recent: 10, daily: 50 },
  ]);
});

it('limits a child sign-in by the deployment, source, family and child account', () => {
  const identity = childIdentity('ABCDEFGHJKMN', '小鹿');
  expect(childAccountBudget(identity)).toBe('child:["ABCDEFGHJKMN","小鹿"]');
  expect(
    admissionBudgets('child-login', { identity, source: 'source', family: 'ABCDEFGHJKMN' }),
  ).toEqual([
    { name: 'authentication', recent: 100, daily: 500 },
    { name: 'ip:source', recent: 30, daily: 200 },
    { name: 'family:ABCDEFGHJKMN', recent: 50, daily: 200 },
    { name: childAccountBudget(identity), recent: 5, daily: 20 },
  ]);
});

it('keeps recovery, PIN reset and KEY redemption in budgets of their own', () => {
  expect(admissionBudgets('recovery', attempt).map(({ name }) => name)).toEqual([
    'recovery:authentication',
    'recovery:ip:203.0.113.7',
    'recovery:email:a@example.test',
  ]);
  expect(admissionBudgets('child-reset', attempt).map(({ name }) => name)).toEqual([
    'child-reset:authentication',
    'child-reset:ip:203.0.113.7',
    'child-reset:email:a@example.test',
  ]);
  expect(admissionBudgets('child-registration', { identity: 'KEY', source: 's' })).toEqual([
    { name: 'child-registration:authentication', recent: 100, daily: 500 },
    { name: 'child-registration:ip:s', recent: 10, daily: 50 },
    { name: 'child-registration:key:KEY', recent: 5, daily: 500 },
  ]);
});

it('names no account budget for an attempt that names no account', () => {
  expect(admissionBudgets('authentication', { identity: '', source: 's' })).toHaveLength(2);
  expect(admissionBudgets('child-login', { identity: '', source: 's' })).toHaveLength(2);
});
