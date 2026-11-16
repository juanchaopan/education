import type { AuthScope } from './authentication.js';

// A budget of attempts under a name that is stored only as a pseudonym: at
// most `recent` attempts in 15 minutes and `daily` in 24 hours.
export type Budget = { name: string; recent: number; daily: number };

// Who makes an attempt: the account it names (empty when it names none), the
// network group it comes from and, for a child, the family code it names.
export type Attempt = { identity: string; source: string; family?: string };

// The account a child's sign-in names, and the budget of that account's
// attempts. Resetting the child's PIN empties this budget.
export const childIdentity = (familyCode: string, nickname: string) =>
  JSON.stringify([familyCode, nickname]);
export const childAccountBudget = (identity: string) => `child:${identity}`;

const perSource = { recent: 30, daily: 200 };
const perEmail = { recent: 10, daily: 50 };
const deployment = { recent: 100, daily: 500 };

// The budgets an attempt in a scope must find room in.
export function admissionBudgets(scope: AuthScope, attempt: Attempt): Budget[] {
  switch (scope) {
    case 'child-login':
      return childSignIn(attempt);
    case 'child-registration':
      return keyRedemption(attempt);
    case 'authentication':
    case 'parent-login':
      return accountRequest('', attempt);
    default:
      return accountRequest(`${scope}:`, attempt);
  }
}

function childSignIn({ identity, source, family }: Attempt): Budget[] {
  return [
    { name: 'authentication', ...deployment },
    { name: `ip:${source}`, ...perSource },
    ...(family ? [{ name: `family:${family}`, recent: 50, daily: 200 }] : []),
    ...(identity ? [{ name: childAccountBudget(identity), recent: 5, daily: 20 }] : []),
  ];
}

// A registration KEY is short-lived and redeemed once, so a source tries few
// of them while one KEY may be tried by a whole family's devices.
function keyRedemption({ identity, source }: Attempt): Budget[] {
  const prefix = 'child-registration:';
  return [
    { name: `${prefix}authentication`, ...deployment },
    { name: `${prefix}ip:${source}`, recent: 10, daily: 50 },
    ...(identity ? [{ name: `${prefix}key:${identity}`, recent: 5, daily: 500 }] : []),
  ];
}

function accountRequest(prefix: string, { identity, source }: Attempt): Budget[] {
  return [
    { name: `${prefix}authentication`, ...deployment },
    { name: `${prefix}ip:${source}`, ...perSource },
    ...(identity ? [{ name: `${prefix}email:${identity}`, ...perEmail }] : []),
  ];
}
