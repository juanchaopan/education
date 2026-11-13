import { Type, type Static } from '@sinclair/typebox';
import { ProblemId, ProblemVersion } from './catalog.js';
import { ChildAccess } from './child-access.js';

const closed = { additionalProperties: false };

// A shelf page holds 24 books; the signed-in child's books come six at a
// time, each with all of its problems.
export const shelfPageSize = 24;
export const childBookPageSize = 6;

// Whether a book can be given to children; an unavailable one stays on the
// shelves of the children who were given it, greyed out.
export const bookStatuses = ['available', 'unavailable'] as const;
export const BookStatus = Type.Union(bookStatuses.map((status) => Type.Literal(status)));

// The filters of the child's books besides all of them: the available books
// the child is still on, those the child finished, and the unavailable ones.
export const childBookFilters = ['learning', 'finished', 'unavailable'] as const;
export const ChildBookFilter = Type.Union(childBookFilters.map((filter) => Type.Literal(filter)));

const BookId = ProblemId;
const Count = Type.Integer({ minimum: 0 });
const Label = Type.String({ minLength: 1, maxLength: 40 });
const Offset = Type.Optional(Type.String({ pattern: '^(0|[1-9][0-9]{0,8})$' }));
const ChildId = ChildAccess.properties.id;
// A moment as an ISO 8601 string.
const Moment = Type.String({ minLength: 1 });

// What every shelf says of a book: its stable id, its name (the category),
// its grade and subject, its cover's id in the site's cover library, its
// status and how many problems it holds.
const bookFields = {
  id: BookId,
  name: Type.String({ minLength: 1 }),
  grade: Type.String({ minLength: 1 }),
  subject: Type.String({ minLength: 1 }),
  cover: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  status: BookStatus,
  problems: Count,
};

// The library (books no child in the family has) or the family shelf (books
// at least one child has), filtered by grade and subject.
export const FamilyShelfQuery = Type.Object(
  {
    shelf: Type.Union([Type.Literal('library'), Type.Literal('family')]),
    grade: Type.Optional(Label),
    subject: Type.Optional(Label),
    offset: Offset,
  },
  closed,
);

// One child's shelf, which can also keep only the books the child has or
// only those the child does not have.
export const ChildShelfQuery = Type.Object(
  {
    grade: Type.Optional(Label),
    subject: Type.Optional(Label),
    state: Type.Optional(Type.Union([Type.Literal('assigned'), Type.Literal('unassigned')])),
    offset: Offset,
  },
  closed,
);

export const ShelfChild = Type.Object({ childId: ChildId }, closed);
export const BookAssignment = Type.Object({ childId: ChildId, bookId: BookId }, closed);
// The signed-in child's books, all of them or one filter, from an offset.
export const ChildBookQuery = Type.Object(
  { books: Type.Optional(ChildBookFilter), offset: Offset },
  closed,
);

// On the library and the family shelf, every child of the family with whether
// they have the book and how many of its problems they have done.
export const FamilyShelfBook = Type.Object(
  {
    ...bookFields,
    children: Type.Array(
      Type.Object({ childId: ChildId, assigned: Type.Boolean(), done: Count }, closed),
    ),
  },
  closed,
);

export const ChildShelfBook = Type.Object(
  { ...bookFields, assigned: Type.Boolean(), done: Count },
  closed,
);

// One page of a shelf: how many books the filter matches, the grades the
// shelf has books in and the subjects of the chosen grade, in the order the
// catalogue lists them, and the books of this page.
function shelfPage<Book extends typeof FamilyShelfBook | typeof ChildShelfBook>(book: Book) {
  return Type.Object(
    {
      total: Count,
      grades: Type.Array(Type.String()),
      subjects: Type.Array(Type.String()),
      books: Type.Array(book, { maxItems: shelfPageSize }),
      hasMore: Type.Boolean(),
    },
    closed,
  );
}

export const FamilyShelfPage = shelfPage(FamilyShelfBook);
export const ChildShelfPage = shelfPage(ChildShelfBook);

// A book given to the signed-in child: when it was given, when the child
// last handed in an answer in it (null before the first), whether it is new
// to the child (no problem of it opened yet), and every problem it holds at
// its latest version with whether the child has done it.
export const ChildBook = Type.Object(
  {
    ...bookFields,
    done: Count,
    assignedAt: Moment,
    studiedAt: Type.Union([Moment, Type.Null()]),
    fresh: Type.Boolean(),
    items: Type.Array(
      Type.Object(
        {
          id: ProblemId,
          version: ProblemVersion,
          title: Type.String({ minLength: 1 }),
          done: Type.Boolean(),
        },
        closed,
      ),
    ),
  },
  closed,
);

// How many of the child's books each filter holds, and how many are new.
export const ChildBookCounts = Type.Object(
  { all: Count, learning: Count, finished: Count, unavailable: Count, fresh: Count },
  closed,
);

export const ChildBookPage = Type.Object(
  {
    counts: ChildBookCounts,
    books: Type.Array(ChildBook, { maxItems: childBookPageSize }),
    hasMore: Type.Boolean(),
  },
  closed,
);

export type BookStatus = Static<typeof BookStatus>;
export type ChildBookFilter = Static<typeof ChildBookFilter>;
export type FamilyShelfQuery = Static<typeof FamilyShelfQuery>;
export type ChildShelfQuery = Static<typeof ChildShelfQuery>;
export type ShelfChild = Static<typeof ShelfChild>;
export type BookAssignment = Static<typeof BookAssignment>;
export type ChildBookQuery = Static<typeof ChildBookQuery>;
export type FamilyShelfBook = Static<typeof FamilyShelfBook>;
export type ChildShelfBook = Static<typeof ChildShelfBook>;
export type FamilyShelfPage = Static<typeof FamilyShelfPage>;
export type ChildShelfPage = Static<typeof ChildShelfPage>;
export type ChildBook = Static<typeof ChildBook>;
export type ChildBookCounts = Static<typeof ChildBookCounts>;
export type ChildBookPage = Static<typeof ChildBookPage>;
