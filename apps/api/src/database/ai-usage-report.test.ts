import { describe, expect, it } from 'vitest';
import { usageAlerts } from './ai-usage-report.js';

const none = { reserved: 0, released: 0, unknown: 0, settled: 0, 'out-of-bounds': 0 };

describe('AI usage alerts', () => {
  it('stays quiet with no calls, calls never sent, or a few failures among many replies', () => {
    expect(usageAlerts(none)).toEqual([]);
    expect(usageAlerts({ ...none, released: 40, reserved: 2 })).toEqual([]);
    expect(usageAlerts({ ...none, unknown: 2 })).toEqual([]);
    expect(usageAlerts({ ...none, unknown: 3, settled: 4 })).toEqual([]);
  });

  it('reports a failing provider once at least three and half of the sent calls fail', () => {
    expect(usageAlerts({ ...none, unknown: 3 })).toEqual(['provider-failing']);
    expect(usageAlerts({ ...none, unknown: 3, settled: 3 })).toEqual(['provider-failing']);
  });

  it('reports any reply outside the bounds, which pauses paid AI for the month', () => {
    expect(usageAlerts({ ...none, 'out-of-bounds': 1, settled: 20 })).toEqual([
      'reply-out-of-bounds',
    ]);
    expect(usageAlerts({ ...none, 'out-of-bounds': 2, unknown: 1 })).toEqual([
      'provider-failing',
      'reply-out-of-bounds',
    ]);
  });
});
