import { backdropScenery } from '@education/problems/backdrops';
import { expect, it } from 'vitest';
import { backdrops } from './backdrops';

// The teacher is told each backdrop's scenery from the problem package, which
// the server reads too, so a question about a lesson's scenery is answered
// from one short sentence of what the picture shows.
it('describes every backdrop in the library in one short sentence, and no other', () => {
  expect(Object.keys(backdropScenery).sort()).toEqual(Object.keys(backdrops).sort());
  for (const sentence of Object.values(backdropScenery)) {
    expect(sentence.trim()).toBe(sentence);
    expect(sentence.length).toBeGreaterThan(10);
    expect(sentence.length).toBeLessThanOrEqual(60);
  }
});
