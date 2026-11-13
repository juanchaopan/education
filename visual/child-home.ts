import type { ChildBook, ChildBookPage, ChildSession, ProblemSummary } from '@education/contracts';
import type { Api } from './api';

// Test fixtures only: these books and problems never enter the problem list.
const titles = ['一棵青菜有多重', '两只小兔分萝卜', '彩铅怎么配对', '谁的影子长', '排队的小鸭子'];

function book(id: string, fields: Partial<ChildBook>): ChildBook {
  const problems = fields.problems ?? 5;
  const done = fields.done ?? 0;
  return {
    id,
    name: '学而思',
    grade: '一年级',
    subject: '数学',
    cover: null,
    status: 'available',
    problems,
    done,
    assignedAt: '2026-11-01T08:00:00+08:00',
    studiedAt: '2026-11-07T08:00:00+08:00',
    fresh: false,
    items: Array.from({ length: problems }, (_, place) => ({
      id: `visual-fixture-${id}-${place + 1}`,
      version: 1,
      title: titles[place % titles.length]!,
      done: place < done,
    })),
    ...fields,
  };
}

const fresh = book('visual-fixture-pinyin', {
  name: '拼音乐园',
  subject: '语文',
  fresh: true,
  assignedAt: '2026-11-07T09:00:00+08:00',
  studiedAt: null,
});
export const going = book('visual-fixture-xueersi', { done: 2 });
const poems = book('visual-fixture-poems', {
  name: '古诗诵读',
  subject: '语文',
  problems: 13,
  done: 12,
  studiedAt: '2026-11-04T08:00:00+08:00',
});
const finished = book('visual-fixture-thinking', {
  name: '思维训练',
  problems: 6,
  done: 6,
  studiedAt: '2026-11-01T08:00:00+08:00',
});
export const unavailable = book('visual-fixture-rhymes', {
  name: '儿歌和童谣',
  subject: '语文',
  status: 'unavailable',
  problems: 6,
  done: 2,
  studiedAt: '2026-10-07T08:00:00+08:00',
});

const counts = { all: 5, learning: 3, finished: 1, unavailable: 1, fresh: 1 };
const page = (books: ChildBook[], hasMore = false): ChildBookPage => ({ counts, books, hasMore });

const ok = (json: unknown) => ({ status: 200, json });

const child: ChildSession = { role: 'child', nickname: '小米', csrfToken: 'c'.repeat(43) };

// A signed-in child with five books: one new, two in progress, one finished
// and one unavailable, with more to come. The next batch stays on its way,
// so a touch screen that reads ahead shows it loading.
export const childHomeApi: Api = {
  'GET /api/v1/children/session': ok(child),
  'GET /api/v1/children/assignments': ok(page([fresh, going, poems, finished], true)),
  'GET /api/v1/children/assignments?offset=6': 'pending',
};

// The same child looking at the unavailable book alone.
export const unavailableBooksApi: Api = {
  ...childHomeApi,
  'GET /api/v1/children/assignments': ok(page([unavailable])),
};

// A child given no book yet.
export const noBooksApi: Api = {
  ...childHomeApi,
  'GET /api/v1/children/assignments': ok({
    counts: { all: 0, learning: 0, finished: 0, unavailable: 0, fresh: 0 },
    books: [],
    hasMore: false,
  }),
};

// The garden lesson, opened by a child given its book, at its title card.
const garden: ProblemSummary = {
  id: 'garden-balance',
  version: 1,
  title: '一棵青菜有多重',
  grade: '一年级',
  subject: '数学',
  category: '学而思',
  sequence: 1,
};
export const gardenLessonApi: Api = {
  'GET /api/v1/children/session': ok(child),
  'GET /api/v1/problems/garden-balance/1': ok(garden),
  'GET /api/v1/problems/garden-balance/1/draft': ok({ draft: null }),
};
