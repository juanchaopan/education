import { describe, expect, it } from 'vitest';
import { problemAccess, type ProblemViewer } from './problem-access.js';

const given: ProblemViewer = { kind: 'child', given: new Set(['given']) };
const notGiven: ProblemViewer = { kind: 'child', given: new Set(['another']) };
const parent: ProblemViewer = { kind: 'parent' };
const available = (id: string) => ({ id, status: 'available' as const });
const unavailable = (id: string) => ({ id, status: 'unavailable' as const });

describe('whether a problem opens', () => {
  it('is missing for anyone when the version is not on the problem list', () => {
    expect(problemAccess(given, undefined)).toBe('missing');
    expect(problemAccess(parent, undefined)).toBe('missing');
  });

  it('is unassigned for a child not given the book', () => {
    expect(problemAccess(notGiven, available('given'))).toBe('unassigned');
    expect(problemAccess({ kind: 'child', given: new Set() }, available('given'))).toBe(
      'unassigned',
    );
  });

  it('is unassigned, not unavailable, for a child never given an unavailable book', () => {
    expect(problemAccess(notGiven, unavailable('given'))).toBe('unassigned');
  });

  it('is unavailable for a child given the book and for a parent', () => {
    expect(problemAccess(given, unavailable('given'))).toBe('unavailable');
    expect(problemAccess(parent, unavailable('given'))).toBe('unavailable');
  });

  it('is practice for a child given an available book and preview for a parent', () => {
    expect(problemAccess(given, available('given'))).toBe('practice');
    expect(problemAccess(parent, available('given'))).toBe('preview');
  });
});
