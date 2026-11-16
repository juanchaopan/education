import type { AuthScope } from './authentication.js';

// A budget of attempts under a name that is stored only as a pseudonym: at
// most `recent` attempts in 15 minutes and `daily` in 24 hours.
export type Budget = { name: string; recent: number; daily: number };

// Who makes an attempt: the account it names (empty when it names none), the
// network group it comes from and, for a child, the family code it names.
export type Attempt = { identity: string; source: string; family?: string };

// How a scope counts its attempts. Every attempt first takes a place in each
// budget, so attempts sent at the same moment cannot pass a limit together.
// A sign-in, and a parent confirming their password, counts only failures: a
// success gives its places back and empties `account`, the budget of the
// account it signed in to, so one person's mistakes or many visitors never
// hold back someone who knows their PIN or password. Other scopes count every
// attempt.
export type AdmissionPolicy = {
  budgets: Budget[];
  counts: 'every-attempt' | 'failures';
  account?: string;
};

// Failures of sign-ins and password confirmations across the whole site are
// only watched: more than `threshold` of them in one fixed 15-minute window
// write one warning to the log, and no one is refused for them. `warned` marks
// a window whose warning is written, once for every instance together.
export const failureWatch = {
  name: 'sign-in-failures',
  warned: 'sign-in-failures-warned',
  threshold: 100,
};

// The account a child's sign-in names, and the budget of that account's
// failed attempts. A successful sign-in or a new PIN empties this budget.
export const childIdentity = (familyCode: string, nickname: string) =>
  JSON.stringify([familyCode, nickname]);
export const childAccountBudget = (identity: string) => `child:${identity}`;

const perSource = { recent: 30, daily: 200 };
const perEmail = { recent: 10, daily: 50 };
const deployment = { recent: 100, daily: 500 };

export function admissionPolicy(scope: AuthScope, attempt: Attempt): AdmissionPolicy {
  switch (scope) {
    case 'child-login':
      return childSignIn(attempt);
    case 'parent-login':
      return parentSignIn(attempt);
    case 'child-registration':
      return everyAttempt(keyRedemption(attempt));
    case 'authentication':
      return everyAttempt(accountRequest('', attempt));
    default:
      return everyAttempt(accountRequest(`${scope}:`, attempt));
  }
}

const everyAttempt = (budgets: Budget[]): AdmissionPolicy => ({ budgets, counts: 'every-attempt' });

function failures(shared: Budget[], account: Budget | undefined): AdmissionPolicy {
  return account
    ? { budgets: [...shared, account], counts: 'failures', account: account.name }
    : { budgets: shared, counts: 'failures' };
}

function childSignIn({ identity, source, family }: Attempt): AdmissionPolicy {
  return failures(
    [
      { name: `child-login:ip:${source}`, ...perSource },
      ...(family ? [{ name: `family:${family}`, recent: 50, daily: 200 }] : []),
    ],
    identity ? { name: childAccountBudget(identity), recent: 5, daily: 20 } : undefined,
  );
}

function parentSignIn({ identity, source }: Attempt): AdmissionPolicy {
  return failures(
    [{ name: `parent-login:ip:${source}`, ...perSource }],
    identity ? { name: `parent-login:email:${identity}`, ...perEmail } : undefined,
  );
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
