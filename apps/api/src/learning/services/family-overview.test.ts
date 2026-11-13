import { describe, expect, it, vi } from 'vitest';
import type { CalendarDate, ProblemOutcome } from '@education/contracts';
import type { DayFacts } from '../domain/study-days.js';
import type {
  ChildEvidence,
  FamilyLearning,
  ProblemEvidence,
  RangeRow,
} from '../repositories/postgres-family-overview.js';
import { createFamilyOverviewService } from './family-overview.js';

const mi = '11111111-1111-4111-8111-111111111111';
const le = '22222222-2222-4222-8222-222222222222';
const titles: Record<string, string> = {
  'pattern@1': '辨认规律',
  'garden@2': '菜园天平',
  'trains@1': '小火车',
};
const title = (id: string, version: number) => titles[`${id}@${version}`];
// 20:30 on 12 November in China is still 12 November in Toronto.
const now = () => new Date('2026-11-12T12:30:00Z');

function problem(id: string, version: number, counts: Partial<ProblemEvidence> = {}) {
  return { id, version, independent: 0, assisted: 0, incorrect: 0, ...counts };
}

type Family = {
  timeZone?: string;
  evidence?: ChildEvidence[];
  facts?: Record<
    string,
    { seconds?: [CalendarDate, number][]; outcomes?: [CalendarDate, ProblemOutcome[]][] }
  >;
  rangeRows?: RangeRow[];
};

function family(
  { timeZone = 'Asia/Shanghai', evidence = [], facts = {}, rangeRows = [] }: Family,
  clock = now,
) {
  const store = {
    timeZone: vi.fn(async () => timeZone),
    evidence: vi.fn(async () => evidence),
    hasChild: vi.fn(async (childId: string) => childId === mi),
    dayFacts: vi.fn(async (...[childIds]: Parameters<FamilyLearning['dayFacts']>) => {
      const entries = childIds.map((childId): [string, DayFacts] => [
        childId,
        {
          seconds: new Map(facts[childId]?.seconds ?? []),
          outcomes: new Map(facts[childId]?.outcomes ?? []),
        },
      ]);
      return new Map(entries);
    }),
    earliest: vi.fn(async () => new Map([[mi, '2026-10-01']])),
    rangeRows: vi.fn(async () => rangeRows),
    totals: vi.fn(async () => ({ problems: 38, seconds: 22_800 })),
  } satisfies FamilyLearning;
  const service = createFamilyOverviewService((_token, work) => work(store), title, clock);
  return { service, store };
}

describe('the overview', () => {
  it("gives each child the 28 days ending today in the family's zone, in the family's order", async () => {
    const { service, store } = family({
      timeZone: 'America/Toronto',
      evidence: [
        { childId: mi, problems: [] },
        { childId: le, problems: [] },
      ],
      facts: {
        [mi]: { seconds: [['2026-11-12', 720]], outcomes: [['2026-11-12', [['pattern', 'open']]]] },
      },
    });
    const overview = await service.overview('session');
    expect(overview.timeZone).toBe('America/Toronto');
    expect(overview.today).toBe('2026-11-12');
    expect(overview.children.map(({ id }) => id)).toEqual([mi, le]);
    const [mine, theirs] = overview.children;
    expect(mine!.days).toHaveLength(28);
    expect(mine!.days[0]!.date).toBe('2026-10-16');
    expect(mine!.days.at(-1)).toEqual({
      date: '2026-11-12',
      seconds: 720,
      problems: { independent: 0, assisted: 0, open: 1 },
      ids: [['pattern', 'open']],
    });
    expect(mine!.earliest).toBe('2026-10-01');
    expect(theirs!.earliest).toBeNull();
    const [, , { window }] = store.dayFacts.mock.calls[0]!;
    expect(window).toEqual({
      start: new Date('2026-10-16T04:00:00Z'),
      end: new Date('2026-11-13T05:00:00Z'),
    });
  });

  it('starts the next day at midnight of the family, not of the server', async () => {
    const { service } = family({}, () => new Date('2026-11-12T16:00:00Z'));
    expect((await service.overview('session')).today).toBe('2026-11-13');
  });

  it('suggests problems answered wrongly twice and never finished alone, when they can be opened', async () => {
    const { service } = family({
      evidence: [
        {
          childId: mi,
          problems: [
            problem('garden', 2, { incorrect: 2, assisted: 1 }),
            problem('pattern', 1, { incorrect: 1 }),
            problem('pattern', 2, { incorrect: 3 }),
            problem('lesson', 1, { incorrect: 4, independent: 1 }),
          ],
        },
      ],
    });
    const [child] = (await service.overview('session')).children;
    expect(child!.review).toEqual([{ id: 'garden', version: 2, title: '菜园天平', incorrect: 2 }]);
  });
});

describe('earlier days', () => {
  it('gives one child the 28 days ending on the day asked for', async () => {
    const { service } = family({});
    const { days } = await service.days('session', mi, '2026-10-15');
    expect(days.map(({ date }) => date)).toEqual(
      expect.arrayContaining(['2026-09-18', '2026-10-15']),
    );
    expect(days).toHaveLength(28);
  });

  it('turns away a day still to come or a child of another family', async () => {
    const { service } = family({});
    await expect(service.days('session', mi, '2026-11-13')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(service.days('session', le, '2026-11-12')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('a stretch of the learning record', () => {
  it('counts a problem once in its best state over the days, and lists the problems by state', async () => {
    const { service } = family({
      facts: {
        [mi]: {
          seconds: [
            ['2026-11-11', 300],
            ['2026-11-12', 420],
          ],
          outcomes: [
            ['2026-11-11', [['garden', 'open']]],
            [
              '2026-11-12',
              [
                ['garden', 'independent'],
                ['trains', 'open'],
                ['pattern', 'assisted'],
              ],
            ],
          ],
        },
      },
      rangeRows: [
        { id: 'trains', version: 1, rank: 0, attempts: 3, hints: 2 },
        { id: 'pattern', version: 1, rank: 1, attempts: 1, hints: 1 },
        { id: 'garden', version: 2, rank: 2, attempts: 2, hints: 0 },
        { id: 'retired', version: 9, rank: 0, attempts: 1, hints: 0 },
      ],
    });
    expect(await service.range('session', mi, '2026-11-11', '2026-11-12')).toEqual({
      from: '2026-11-11',
      to: '2026-11-12',
      seconds: 720,
      problems: { independent: 1, assisted: 1, open: 1 },
      items: [
        {
          id: 'garden',
          version: 2,
          title: '菜园天平',
          state: 'independent',
          attempts: 2,
          hints: 0,
        },
        { id: 'pattern', version: 1, title: '辨认规律', state: 'assisted', attempts: 1, hints: 1 },
        { id: 'trains', version: 1, title: '小火车', state: 'open', attempts: 3, hints: 2 },
        { id: 'retired', version: 9, title: null, state: 'open', attempts: 1, hints: 0 },
      ],
      total: { problems: 38, seconds: 22_800 },
    });
  });

  it('turns away more than seven days, days in the wrong order and a child of another family', async () => {
    const { service } = family({});
    await expect(service.range('session', mi, '2026-11-05', '2026-11-12')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(service.range('session', mi, '2026-11-12', '2026-11-10')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(service.range('session', le, '2026-11-12', '2026-11-12')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
