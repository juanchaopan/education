import { expect, it } from 'vitest';
import { returnPath, signInPath } from './sign-in-path';

it.each([
  ['/problems/garden-balance/1', '/problems/garden-balance/1'],
  ['/family', '/family'],
  ['/family/practice?child=c1&state=assigned', '/family/practice?child=c1&state=assigned'],
  ['/family/privacy#family-deletion-title', '/family/privacy#family-deletion-title'],
  ['/books?open=g1-math', '/books?open=g1-math'],
  ['/family/../books', '/books'],
])('comes back to %s', (next, path) => {
  expect(returnPath(next)).toBe(path);
});

it.each([
  ['nothing', null],
  ['an empty value', ''],
  ['another site', 'https://example.com/family'],
  ['another scheme', 'javascript:alert(1)'],
  ['a relative path', 'family'],
  ['a protocol-relative link', '//example.com/family'],
  ['a backslash read as a slash', '/\\example.com/family'],
  ['a leading backslash', '\\\\example.com'],
  ['a tab the browser drops', '/\t/example.com'],
  ['a line break the browser drops', '/\n/example.com'],
])('ignores %s', (_name, next) => {
  expect(returnPath(next)).toBeUndefined();
});

it('signs in on a tab, coming back to a page when there is one', () => {
  expect(signInPath('child')).toBe('/login/child');
  expect(signInPath('child', '/problems/garden-balance/1')).toBe(
    '/login/child?next=%2Fproblems%2Fgarden-balance%2F1',
  );
  expect(signInPath('parent', '/family/practice?child=c1')).toBe(
    '/login/parent?next=%2Ffamily%2Fpractice%3Fchild%3Dc1',
  );
});
