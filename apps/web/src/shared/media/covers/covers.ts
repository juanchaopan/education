import { catalog, type Age } from '../../lib/media-library';

// One painted 3:4 book cover, chosen for a new book by its tags: the subjects
// and school years it suits, what it shows, and the prompt it was generated
// from, as docs/design/lesson-media.md gives it. A book names its cover by id
// in the problem list; several books may share one.
type CoverEntry = Readonly<{
  file: string;
  subjects: readonly [string, ...string[]];
  ages: readonly [Age, ...Age[]];
  motif: string;
  prompt: string;
}>;

// The covers are painted when a book first needs one, so the library starts
// empty and every book is drawn with its subject's default cover until then.
const entries = {} as const satisfies Record<string, CoverEntry>;

export type CoverId = keyof typeof entries;

// Every cover in the library, by id, each with the address of its picture.
export const covers: Readonly<
  Record<string, CoverEntry & Readonly<{ id: string; image: string }>>
> = catalog<CoverId, CoverEntry>(
  entries,
  import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' }),
);

// The address of a book's painted cover, or undefined for a book without one
// or one whose cover is not in the library, which then gets its default cover.
export function coverImage(cover: string | null): string | undefined {
  return cover === null || !Object.hasOwn(covers, cover) ? undefined : covers[cover]?.image;
}
