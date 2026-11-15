import { expect, it } from 'vitest';
import { problemPath } from './problem-path';

it('writes the path of a problem version', () => {
  expect(problemPath('garden-balance', 1)).toBe('/problems/garden-balance/1');
});

it('escapes an id that would break the path', () => {
  expect(problemPath('a/b', 2)).toBe('/problems/a%2Fb/2');
});
