import { useState } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import type { Static } from '@sinclair/typebox';
import {
  ChildBookPage,
  childBookPageSize,
  ChildShelfPage,
  FamilyShelfPage,
  shelfPageSize,
  type ChildBookFilter,
} from '@education/contracts';
import { everyBook, type ShelfFilter } from '../model';
import { sessionRead, sessionRequest } from './session-request';

export const bookshelfQueryKey = ['bookshelf'];

// Which shelf is open: the library, the family's shelf, or one child's.
export type ShelfView = 'library' | 'family' | { childId: string };

const signedOut = '登录状态已更新，请刷新页面。';
const unopened = '书架没打开，请再试一次。';

// A read that fails with `failed`, or asks for a refresh when the session
// has changed.
const reading = (failed: string) => ({ failed, 401: signedOut, 403: signedOut });

const childPath = (childId: string) => `parents/children/${encodeURIComponent(childId)}`;

function shelfPath(view: ShelfView, filter: ShelfFilter, offset: number) {
  const query = new URLSearchParams();
  if (typeof view === 'string') query.set('shelf', view);
  if (filter.grade) query.set('grade', filter.grade);
  if (filter.subject) query.set('subject', filter.subject);
  if (filter.state) query.set('state', filter.state);
  query.set('offset', String(offset));
  const base = typeof view === 'string' ? 'parents/books' : `${childPath(view.childId)}/books`;
  return `${base}?${query.toString()}`;
}

const viewKey = (view: ShelfView) => (typeof view === 'string' ? view : view.childId);
const shelfKey = (csrf: string, view?: ShelfView) =>
  view === undefined
    ? [...bookshelfQueryKey, csrf, 'shelf']
    : [...bookshelfQueryKey, csrf, 'shelf', viewKey(view)];
const assignedKey = (csrf: string, childId?: string) =>
  childId === undefined
    ? [...bookshelfQueryKey, csrf, 'assigned']
    : [...bookshelfQueryKey, csrf, 'assigned', childId];

// A list read a batch at a time, each batch after the last; the next batch
// starts where the books read so far end.
function batches<Page extends { hasMore: boolean }>(
  queryKey: readonly unknown[],
  size: number,
  readBatch: (offset: number) => Promise<Page>,
) {
  return {
    queryKey,
    retry: false,
    initialPageParam: 0,
    getNextPageParam: (last: Page, pages: Page[]) =>
      last.hasMore ? pages.length * size : undefined,
    queryFn: ({ pageParam }: { pageParam: number }) => readBatch(pageParam),
  };
}

// A shelf read 24 books at a time.
function shelfQuery<Schema extends typeof FamilyShelfPage | typeof ChildShelfPage>(
  csrf: string,
  view: ShelfView,
  filter: ShelfFilter,
  schema: Schema,
) {
  return batches<Static<Schema>>(
    [...shelfKey(csrf, view), filter.grade, filter.subject, filter.state],
    shelfPageSize,
    (offset) => sessionRead(shelfPath(view, filter, offset), schema, reading(unopened), csrf),
  );
}

export function useFamilyShelf(csrf: string, shelf: 'library' | 'family', filter: ShelfFilter) {
  return useInfiniteQuery(shelfQuery(csrf, shelf, filter, FamilyShelfPage));
}

export function useChildShelf(csrf: string, childId: string, filter: ShelfFilter) {
  return useInfiniteQuery(shelfQuery(csrf, { childId }, filter, ChildShelfPage));
}

// Whether the family has been given any book, which says, once the library
// is empty, whether every book was given away or there are none yet. It is
// asked only when needed, and afresh each time.
export function useAnyBookGiven(csrf: string, needed: boolean) {
  return useQuery({
    queryKey: [...bookshelfQueryKey, csrf, 'any-given'],
    enabled: needed,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () =>
      (
        await sessionRead(
          shelfPath('family', everyBook, 0),
          FamilyShelfPage,
          reading(unopened),
          csrf,
        )
      ).total > 0,
  });
}

// The first page of the books each named child has, one query per child, for
// the overview; its total is how many books the child has.
export function useChildrenAssigned(csrf: string, childIds: readonly string[]) {
  return useQueries({
    queries: childIds.map((childId) => ({
      queryKey: assignedKey(csrf, childId),
      retry: false,
      queryFn: () =>
        sessionRead(
          shelfPath({ childId }, { grade: '', subject: '', state: 'assigned' }, 0),
          ChildShelfPage,
          reading('暂时无法查看安排的书，请刷新页面。'),
          csrf,
        ),
    })),
  });
}

// The signed-in child's books, all of them or one filter, six at a time.
// While another filter is read, the books of the last one stand in for it,
// so the page keeps its filters, and the one just chosen keeps the focus.
export function useChildBooks(csrf: string, filter?: ChildBookFilter) {
  return useInfiniteQuery({
    ...batches<ChildBookPage>(
      [...bookshelfQueryKey, csrf, 'child-books', filter ?? 'all'],
      childBookPageSize,
      (offset) => {
        const query = new URLSearchParams({ offset: String(offset) });
        if (filter) query.set('books', filter);
        return sessionRead(
          `children/assignments?${query.toString()}`,
          ChildBookPage,
          reading('我的书没打开，请再试一次。'),
          csrf,
        );
      },
    ),
    placeholderData: keepPreviousData,
  });
}

export type BookChange = Readonly<{ childId: string; bookId: string; assign: boolean }>;

type ShelfData = InfiniteData<FamilyShelfPage | ChildShelfPage>;
type ShelfBook = ShelfData['pages'][number]['books'][number];

// Every page of a shelf with one book changed in place. Books never move or
// leave a shelf already read, so the count and the next batch's place stay
// true to the server.
function rewrite(data: ShelfData, bookId: string, book: (found: ShelfBook) => ShelfBook) {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      books: page.books.map((found) => (found.id === bookId ? book(found) : found)),
    })),
  } as ShelfData;
}

const holds = (data: ShelfData | undefined, bookId: string, status: string) =>
  !!data?.pages.some((page) =>
    page.books.some((book) => book.id === bookId && book.status === status),
  );

// Shows a change on every shelf already read: the child's switch on the
// library and the family shelf, and the book on the child's own shelf. A
// book that is unavailable leaves the child's shelf once taken back, so that
// shelf is read again rather than changed in place.
function applyChange(client: QueryClient, csrf: string, { childId, bookId, assign }: BookChange) {
  for (const view of ['library', 'family'] as const)
    client.setQueriesData<ShelfData>({ queryKey: shelfKey(csrf, view) }, (data) =>
      data
        ? rewrite(data, bookId, (book) =>
            'children' in book
              ? {
                  ...book,
                  children: book.children.map((child) =>
                    child.childId === childId ? { ...child, assigned: assign } : child,
                  ),
                }
              : book,
          )
        : data,
    );
  const own = shelfKey(csrf, { childId });
  const leaves = client
    .getQueriesData<ShelfData>({ queryKey: own })
    .some(([, data]) => !assign && holds(data, bookId, 'unavailable'));
  if (leaves) return client.invalidateQueries({ queryKey: own });
  client.setQueriesData<ShelfData>({ queryKey: own }, (data) =>
    data ? rewrite(data, bookId, (book) => ({ ...book, assigned: assign })) : data,
  );
}

async function sendChange(csrf: string, { childId, bookId, assign }: BookChange) {
  const message = assign ? '没安排上，再点一次。' : '没取消成功，再点一次。';
  const response = await sessionRequest(
    `${childPath(childId)}/assignments/${encodeURIComponent(bookId)}`,
    {},
    csrf,
    10000,
    assign ? 'PUT' : 'DELETE',
  ).catch(() => {
    throw new Error(message);
  });
  if (response.status === 409) throw new Error('这本书暂时不能安排，请刷新书架。');
  if (response.status === 401 || response.status === 403) throw new Error(signedOut);
  if (response.status !== 204) throw new Error(message);
}

// The last change that did not go through, and why.
export type BookFailure = Readonly<{ childId: string; bookId: string; message: string }>;

const changeKey = (childId: string, bookId: string) => `${childId}/${bookId}`;

// Gives children books and takes them back, several at once if the parent
// presses several switches. Each switch waits for its own answer; once one
// goes through, every shelf already read shows it and the overview reads that
// child's books again. The last change that did not go through is kept, with
// why, until a switch is pressed again.
export function useBookToggles(csrf: string) {
  const client = useQueryClient();
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [failure, setFailure] = useState<BookFailure | null>(null);
  const mutation = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: (change: BookChange) => sendChange(csrf, change),
    onSuccess: (_, change) =>
      Promise.all([
        applyChange(client, csrf, change),
        client.invalidateQueries({ queryKey: assignedKey(csrf, change.childId) }),
      ]),
  });
  const settle = (key: string) =>
    setPending((keys) => new Set([...keys].filter((pendingKey) => pendingKey !== key)));
  return {
    failure,
    isPending: (childId: string, bookId: string) => pending.has(changeKey(childId, bookId)),
    // Each press keeps its own promise, so concurrent switches each hear
    // their own answer; it settles once the change has gone through or not.
    toggle: (change: BookChange): Promise<void> => {
      const key = changeKey(change.childId, change.bookId);
      if (pending.has(key)) return Promise.resolve();
      setFailure(null);
      setPending((keys) => new Set(keys).add(key));
      return mutation
        .mutateAsync(change)
        .then(
          () => undefined,
          (error: Error) =>
            setFailure({ childId: change.childId, bookId: change.bookId, message: error.message }),
        )
        .finally(() => settle(key));
    },
  };
}

// Reads the library or the family shelf on show again, and the other when it
// is shown next, so books given away leave the library and books every child
// gave back return to it.
export function useRefreshShelves(csrf: string) {
  const client = useQueryClient();
  return (shown: 'library' | 'family') =>
    Promise.all(
      (['library', 'family'] as const).map((view) =>
        client.invalidateQueries({
          queryKey: shelfKey(csrf, view),
          refetchType: view === shown ? 'active' : 'none',
        }),
      ),
    );
}
