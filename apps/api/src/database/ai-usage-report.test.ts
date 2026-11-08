import { describe, expect, it } from 'vitest';
import { usageAlerts } from './ai-usage-report.js';

const none = { reserved: 0, released: 0, unknown: 0, settled: 0, 'out-of-bounds': 0 };

describe('AI usage alerts', () => {
  it('stays quiet with no calls, calls still in flight, or a few failures among many replies', () => {
    expect(usageAlerts(none, false)).toEqual([]);
    expect(usageAlerts({ ...none, reserved: 5 }, false)).toEqual([]);
    expect(usageAlerts({ ...none, unknown: 2 }, false)).toEqual([]);
    expect(usageAlerts({ ...none, unknown: 2, released: 1, settled: 4 }, false)).toEqual([]);
  });

  it('reports a failing provider once at least three and half of the ended calls failed', () => {
    expect(usageAlerts({ ...none, unknown: 3 }, false)).toEqual(['provider-failing']);
    expect(usageAlerts({ ...none, unknown: 3, settled: 3 }, false)).toEqual(['provider-failing']);
  });

  it('counts calls the provider rejected, such as with a revoked key, as failures', () => {
    expect(usageAlerts({ ...none, released: 40 }, false)).toEqual(['provider-failing']);
  });

  it('reports a month paused by a reply outside the bounds, even in an hour without calls', () => {
    expect(usageAlerts(none, true)).toEqual(['reply-out-of-bounds']);
    expect(usageAlerts({ ...none, 'out-of-bounds': 2, unknown: 1 }, true)).toEqual([
      'provider-failing',
      'reply-out-of-bounds',
    ]);
  });
});
