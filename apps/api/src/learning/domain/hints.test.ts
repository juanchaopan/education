import { describe, expect, it } from 'vitest';
import { authoredHint } from './hints.js';

describe('authoredHint', () => {
  const hints = { 'count-groups': '数一数有几组。', long: '数'.repeat(2001) };

  it("finds a hint by its id among the problem's own hints", () => {
    expect(authoredHint(hints, 'count-groups')).toBe('数一数有几组。');
  });

  it('finds nothing for a missing id, an inherited name, an empty list or a text too long', () => {
    for (const id of ['missing', 'constructor', 'toString', 'long'])
      expect(authoredHint(hints, id)).toBeUndefined();
    expect(authoredHint(undefined, 'count-groups')).toBeUndefined();
  });
});
