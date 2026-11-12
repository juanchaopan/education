import type {
  ChildShelfBook,
  ChildShelfPage,
  FamilyShelfBook,
  FamilyShelfPage,
} from '@education/contracts';

// The family's shelves for the parent space screenshots: 小米 and the child
// with the long nickname. Test fixtures only: these books never enter the
// problem list.
export const xiaomi = '11111111-1111-4111-8111-111111111111';
export const lele = '22222222-2222-4222-8222-222222222222';

type Fixture = Readonly<{
  id: string;
  name: string;
  subject: string;
  problems: number;
  // Each child who has the book, with the problems they have done.
  given?: Readonly<Record<string, number>>;
  // Problems done by a child who no longer has the book.
  left?: Readonly<Record<string, number>>;
  unavailable?: boolean;
}>;

const fixtures: readonly Fixture[] = [
  {
    id: 'visual-thinking',
    name: '思维训练',
    subject: '数学',
    problems: 10,
    given: { [xiaomi]: 10, [lele]: 3 },
  },
  { id: 'visual-xueersi', name: '学而思', subject: '数学', problems: 12, given: { [xiaomi]: 5 } },
  { id: 'visual-mental', name: '口算天天练', subject: '数学', problems: 30 },
  { id: 'visual-pinyin', name: '拼音乐园', subject: '语文', problems: 16, left: { [xiaomi]: 3 } },
  { id: 'visual-poems', name: '古诗诵读', subject: '语文', problems: 13, given: { [xiaomi]: 12 } },
  {
    id: 'visual-songs',
    name: '儿歌和童谣',
    subject: '语文',
    problems: 11,
    given: { [xiaomi]: 4 },
    unavailable: true,
  },
  { id: 'visual-phonics', name: '自然拼读', subject: '英语', problems: 20, given: { [lele]: 0 } },
  { id: 'visual-count', name: '数一数比一比', subject: '数学', problems: 9 },
  {
    id: 'visual-long-name',
    name: '一本书名特别特别长的看图写话练习册',
    subject: '语文',
    problems: 6,
  },
  { id: 'visual-shapes', name: '图形小侦探', subject: '数学', problems: 7 },
  { id: 'visual-science', name: '趣味科学', subject: '科学', problems: 8 },
];

const fields = ({ id, name, subject, problems, unavailable }: Fixture) => ({
  id,
  name,
  grade: '一年级',
  subject,
  cover: null,
  status: unavailable ? ('unavailable' as const) : ('available' as const),
  problems,
});

const given = (fixture: Fixture) => Object.keys(fixture.given ?? {}).length > 0;

const familyBook = (fixture: Fixture): FamilyShelfBook => ({
  ...fields(fixture),
  children: [xiaomi, lele].map((childId) => ({
    childId,
    assigned: childId in (fixture.given ?? {}),
    done: fixture.given?.[childId] ?? fixture.left?.[childId] ?? 0,
  })),
});

const childBook = (fixture: Fixture, childId: string): ChildShelfBook => ({
  ...fields(fixture),
  assigned: childId in (fixture.given ?? {}),
  done: fixture.given?.[childId] ?? fixture.left?.[childId] ?? 0,
});

const page = <Book>(books: Book[]) => ({
  total: books.length,
  grades: ['一年级', '二年级', '三年级'],
  subjects: ['数学', '语文', '英语', '科学'],
  books,
  hasMore: false,
});

// The library: the available books no child has.
export const libraryShelf: FamilyShelfPage = page(
  fixtures.filter((fixture) => !given(fixture) && !fixture.unavailable).map(familyBook),
);

// The family shelf: every book some child has.
export const familyShelf: FamilyShelfPage = page(fixtures.filter(given).map(familyBook));

// One child's shelf: the books that can be given and those the child has.
export const childShelf = (childId: string): ChildShelfPage =>
  page(
    fixtures
      .filter((fixture) => !fixture.unavailable || childId in (fixture.given ?? {}))
      .map((fixture) => childBook(fixture, childId)),
  );

// The books each child has, as the overview reads them.
export const givenBooks = (childId: string): ChildShelfPage =>
  page(
    fixtures
      .filter((fixture) => childId in (fixture.given ?? {}))
      .map((fixture) => childBook(fixture, childId)),
  );
