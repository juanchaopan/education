import { describe, expect, it } from 'vitest';
import { problemVariations, variationAttempt, type VariationRound } from './variation.js';

const at = (minute: number) => new Date(Date.UTC(2026, 10, 12, 8, minute));
const round = (overrides: Partial<VariationRound> = {}): VariationRound => ({
  id: 'garden-balance',
  version: 1,
  guess: 'independent',
  firstReason: 'independent',
  lastReason: 'independent',
  help: 0,
  startedAt: at(0),
  updatedAt: at(1),
  ...overrides,
});

describe('variationAttempt', () => {
  it('keeps a not-clear first reason and a reason made clear after a hint', () => {
    expect(
      variationAttempt(round({ firstReason: 'incorrect', lastReason: 'assisted', help: 1 })),
    ).toEqual({
      guess: 'independent',
      reason: { first: 'unclear', final: 'assisted' },
      help: 1,
      startedAt: at(0).toISOString(),
      updatedAt: at(1).toISOString(),
    });
  });

  it('ends a reason never said clearly as not clear, whether judged or never given', () => {
    expect(
      variationAttempt(round({ firstReason: 'incorrect', lastReason: 'incorrect' })).reason,
    ).toEqual({ first: 'unclear', final: 'unclear' });
    expect(variationAttempt(round({ firstReason: null, lastReason: null })).reason).toEqual({
      first: null,
      final: 'unclear',
    });
  });

  it('leaves the guess empty when the child left before guessing', () => {
    expect(variationAttempt(round({ guess: null })).guess).toBeNull();
  });
});

describe('problemVariations', () => {
  it('shows each part at the best any round reached and lists what is not yet independent', () => {
    const [garden] = problemVariations([
      round({ guess: 'incorrect', firstReason: 'incorrect', lastReason: 'assisted' }),
      round({ guess: 'assisted', lastReason: null, firstReason: null, startedAt: at(5) }),
    ]);
    expect(garden).toMatchObject({
      id: 'garden-balance',
      version: 1,
      status: { guess: 'assisted', reason: 'assisted' },
      missing: ['guess', 'reason'],
    });
  });

  it('counts a part done once without help as shown, even after a worse round', () => {
    const [garden] = problemVariations([
      round({ guess: 'incorrect', startedAt: at(9) }),
      round({ startedAt: at(0) }),
    ]);
    expect(garden?.status).toEqual({ guess: 'independent', reason: 'independent' });
    expect(garden?.missing).toEqual([]);
    expect(garden?.attempts.map(({ guess }) => guess)).toEqual(['independent', 'incorrect']);
  });

  it('marks a part never right as not yet', () => {
    const [garden] = problemVariations([
      round({ guess: null, firstReason: null, lastReason: null }),
    ]);
    expect(garden?.status).toEqual({ guess: 'not-yet', reason: 'not-yet' });
  });

  it('groups rounds by problem version', () => {
    const problems = problemVariations([
      round(),
      round({ version: 2 }),
      round({ id: 'rail-chase' }),
      round({ startedAt: at(3) }),
    ]);
    expect(problems.map(({ id, version, attempts }) => [id, version, attempts.length])).toEqual([
      ['garden-balance', 1, 2],
      ['garden-balance', 2, 1],
      ['rail-chase', 1, 1],
    ]);
  });
});
