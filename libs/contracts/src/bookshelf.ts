import { Type, type Static } from '@sinclair/typebox';
import { ProblemId, ProblemVersion } from './catalog.js';
import { ChildAccess } from './child-access.js';

const closed = { additionalProperties: false };

// A shelf page holds 24 books; a child's practice comes ten books at a time,
// each with all of its problems.
export const shelfPageSize = 24;
export const practiceBookPageSize = 10;

// Whether a book can be given to children; an unavailable one stays on the
// shelves of the children who were given it, greyed out.
export const bookStatuses = ['available', 'unavailable'] as const;
export const BookStatus = Type.Union(bookStatuses.map((status) => Type.Literal(status)));

const BookId = ProblemId;
const Count = Type.Integer({ minimum: 0 });
const Label = Type.String({ minLength: 1, maxLength: 40 });
const Offset = Type.Optional(Type.String({ pattern: '^(0|[1-9][0-9]{0,8})$' }));
const ChildId = ChildAccess.properties.id;

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
export const PracticeBookQuery = Type.Object({ offset: Offset }, closed);

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

// A book given to the signed-in child, with every problem it holds at its
// latest version and whether the child has done it.
export const PracticeBook = Type.Object(
  {
    ...bookFields,
    done: Count,
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

export const PracticeBookPage = Type.Object(
  { books: Type.Array(PracticeBook, { maxItems: practiceBookPageSize }), hasMore: Type.Boolean() },
  closed,
);

export type BookStatus = Static<typeof BookStatus>;
export type FamilyShelfQuery = Static<typeof FamilyShelfQuery>;
export type ChildShelfQuery = Static<typeof ChildShelfQuery>;
export type ShelfChild = Static<typeof ShelfChild>;
export type BookAssignment = Static<typeof BookAssignment>;
export type PracticeBookQuery = Static<typeof PracticeBookQuery>;
export type FamilyShelfBook = Static<typeof FamilyShelfBook>;
export type ChildShelfBook = Static<typeof ChildShelfBook>;
export type FamilyShelfPage = Static<typeof FamilyShelfPage>;
export type ChildShelfPage = Static<typeof ChildShelfPage>;
export type PracticeBook = Static<typeof PracticeBook>;
export type PracticeBookPage = Static<typeof PracticeBookPage>;
