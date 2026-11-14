import { expect, it } from 'vitest';
import { problemPath, returnPath, signInPath } from './problem-path';

it('writes the path of a problem version', () => {
  expect(problemPath('garden-balance', 1)).toBe('/problems/garden-balance/1');
});

it.each([
  ['/problems/garden-balance/1', '/problems/garden-balance/1'],
  ['/problems/garden-balance/12', '/problems/garden-balance/12'],
])('returns to the problem at %s', (next, path) => {
  expect(returnPath(next)).toBe(path);
});

it.each([
  ['nothing', null],
  ['another site', 'https://example.com/problems/garden-balance/1'],
  ['a protocol-relative link', '//example.com/problems/garden-balance/1'],
  ['another page', '/family'],
  ['a malformed id', '/problems/Garden_Balance/1'],
  ['a padded version', '/problems/garden-balance/01'],
  ['a further path', '/problems/garden-balance/1/answer'],
  ['a query', '/problems/garden-balance/1?x=1'],
  ['an escaped slash', '/problems/garden%2Fbalance/1'],
])('ignores %s', (_name, next) => {
  expect(returnPath(next)).toBeUndefined();
});

it('signs in on the way to a problem', () => {
  expect(signInPath('/problems/garden-balance/1')).toBe('/?next=%2Fproblems%2Fgarden-balance%2F1');
});
