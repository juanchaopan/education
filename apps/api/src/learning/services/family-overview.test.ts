import { describe, expect, it, vi } from 'vitest';
import type { ProblemEvidence } from '../repositories/postgres-family-overview.js';
import { createFamilyOverviewService, overviewOf } from './family-overview.js';

const childId = '11111111-1111-4111-8111-111111111111';
const titles: Record<string, string> = { 'pattern@1': '辨认规律', 'garden@2': '菜园天平' };
const title = (id: string, version: number) => titles[`${id}@${version}`];

function problem(id: string, version: number, counts: Partial<ProblemEvidence> = {}) {
  return { id, version, independent: 0, assisted: 0, incorrect: 0, ...counts };
}

describe('a child on the overview', () => {
  it('counts a problem once across its versions and keeps help apart from finishing alone', () => {
    const overview = overviewOf(
      {
        childId,
        problems: [
          problem('garden', 1, { independent: 1, assisted: 2 }),
          problem('garden', 2, { independent: 2 }),
          problem('pattern', 1, { assisted: 1 }),
          problem('hint-only', 1),
        ],
      },
      title,
    );
    expect(overview.total).toEqual({ problems: 3, independent: 3, assisted: 3 });
  });

  it('suggests problems answered wrongly twice and never finished alone, when they can be opened', () => {
    const overview = overviewOf(
      {
        childId,
        problems: [
          problem('garden', 2, { incorrect: 2, assisted: 1 }),
          problem('pattern', 1, { incorrect: 1 }),
          problem('pattern', 2, { incorrect: 3 }),
          problem('lesson', 1, { incorrect: 4, independent: 1 }),
        ],
      },
      title,
    );
    expect(overview.review).toEqual([
      { id: 'garden', version: 2, title: '菜园天平', incorrect: 2 },
    ]);
  });

  it('shows a child without any record as nothing tried', () => {
    expect(overviewOf({ childId, problems: [] }, title)).toEqual({
      id: childId,
      total: { problems: 0, independent: 0, assisted: 0 },
      review: [],
    });
  });
});

it('reads the family once for the session and keeps its children in order', async () => {
  const second = '22222222-2222-4222-8222-222222222222';
  const read = vi.fn(async () => [
    { childId, problems: [] },
    { childId: second, problems: [problem('pattern', 1, { independent: 1 })] },
  ]);
  const overview = await createFamilyOverviewService(read, title)('session');
  expect(read).toHaveBeenCalledExactlyOnceWith('session');
  expect(overview.children.map(({ id, total }) => [id, total.independent])).toEqual([
    [childId, 0],
    [second, 1],
  ]);
});
