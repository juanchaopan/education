import type { ChildBook, ChildBookCounts } from '@education/contracts';

const titles = ['一棵青菜有多重', '两只小兔分萝卜', '彩铅怎么配对', '谁的影子长', '排队的小鸭子'];

// A child's book for stories and tests: by default the 学而思 maths book,
// opened, five problems with the first two done, studied a day before `now`.
export function childBook(fields: Partial<ChildBook> = {}): ChildBook {
  const problems = fields.items?.length ?? fields.problems ?? titles.length;
  const done = fields.done ?? 2;
  return {
    id: 'g1-math-xueersi',
    name: '学而思',
    grade: '一年级',
    subject: '数学',
    cover: null,
    status: 'available',
    problems,
    done,
    assignedAt: '2026-11-01T08:00:00.000Z',
    studiedAt: '2026-11-19T08:00:00.000Z',
    fresh: false,
    items: Array.from({ length: problems }, (_, place) => ({
      id: `fixture-problem-${place + 1}`,
      version: 1,
      title: titles[place % titles.length]!,
      done: place < done,
    })),
    ...fields,
  };
}

// Now, for the books above.
export const fixtureNow = new Date('2026-11-20T09:00:00.000Z');

export function childBookCounts(fields: Partial<ChildBookCounts> = {}): ChildBookCounts {
  return { all: 14, learning: 9, finished: 4, unavailable: 1, fresh: 1, ...fields };
}
