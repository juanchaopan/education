import { describe, expect, it } from 'vitest';
import { outcomeOf } from './outcome.js';

describe('outcomeOf', () => {
  it('counts a right answer as independent without help and assisted after it', () => {
    expect(outcomeOf('correct', false)).toBe('independent');
    expect(outcomeOf('correct', true)).toBe('assisted');
  });

  it('keeps a wrong or unclear answer as it is, with or without help', () => {
    for (const helped of [false, true]) {
      expect(outcomeOf('incorrect', helped)).toBe('incorrect');
      expect(outcomeOf('uncertain', helped)).toBe('uncertain');
    }
  });
});
