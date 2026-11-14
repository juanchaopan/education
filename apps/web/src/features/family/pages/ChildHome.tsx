import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { childBookFilters, type ChildBookFilter, type ChildSession } from '@education/contracts';
import { usePointerCoarse } from '../../../shared/lib/usePointerCoarse';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { RaisedButton } from '../../../shared/ui/RaisedButton';
import { BookFilters } from '../components/BookFilters';
import { BookListFoot } from '../components/BookListFoot';
import { ChildBookCard } from '../components/ChildBookCard';
import { ChildHomeLayout, type ChildHomeArt } from '../components/ChildHomeLayout';
import { ChildTopBar } from '../components/ChildTopBar';
import { footState } from '../components/foot-state';
import { useChildBooks } from '../data-access/useBookshelf';
import { useChildLogout } from '../data-access/useChildSession';
import styles from './ChildHome.module.css';

function filterOf(value: string | null): ChildBookFilter | undefined {
  return childBookFilters.find((filter) => filter === value);
}

// The filter and the one book open, kept in the address, so coming back from
// a problem finds them as they were. Changing the filter closes the book.
function useHomePlace() {
  const [query, setQuery] = useSearchParams();
  const open = query.get('open');
  const change = (edit: (next: URLSearchParams) => void) =>
    setQuery(
      (current) => {
        const next = new URLSearchParams(current);
        edit(next);
        return next;
      },
      { replace: true },
    );
  return {
    filter: filterOf(query.get('books')),
    open,
    choose: (chosen?: ChildBookFilter) =>
      change((next) => {
        if (chosen) next.set('books', chosen);
        else next.delete('books');
        next.delete('open');
      }),
    toggle: (bookId: string) =>
      change((next) => {
        if (open === bookId) next.delete('open');
        else next.set('open', bookId);
      }),
  };
}

// The signed-in child's home, 我的书: the books a parent gave, new ones first,
// six at a time, under filters with how many books each holds.
export function ChildHome({ session, art }: { session: ChildSession; art: ChildHomeArt }) {
  const place = useHomePlace();
  const books = useChildBooks(session.csrfToken, place.filter);
  const logout = useChildLogout();
  return (
    <ChildHomeLayout
      art={art}
      topBar={
        <ChildTopBar
          nickname={session.nickname}
          leaving={logout.isPending}
          onLogout={() => {
            if (!logout.isPending) logout.mutate(session.csrfToken);
          }}
        />
      }
    >
      {logout.isError && <Notice tone="error">{logout.error.message}</Notice>}
      {books.isPending && <Loading label="正在打开我的书…" />}
      {books.isError && !books.data && (
        <EmptyState
          icon="wifiOff"
          title="我的书没打开"
          description={books.error.message}
          actionLabel="再试一次"
          onAction={() => void books.refetch()}
        />
      )}
      {books.data && <Shelf books={books} place={place} />}
    </ChildHomeLayout>
  );
}

// The books read so far under their filters; a child without books is told
// who gives them. While a newly chosen filter is read, the filters stay and
// the books wait for it.
function Shelf({
  books,
  place,
}: {
  books: ReturnType<typeof useChildBooks>;
  place: ReturnType<typeof useHomePlace>;
}) {
  const pages = books.data?.pages ?? [];
  const counts = pages[0]?.counts;
  if (!counts || counts.all === 0)
    return (
      <EmptyState
        icon="book"
        title="家长还没有给你安排书"
        description="请家长在家长空间的书架上，给你安排一本书。"
      />
    );
  return (
    <>
      <BookFilters counts={counts} filter={place.filter} onFilter={place.choose} />
      {books.isPlaceholderData ? (
        <Loading label="正在打开我的书…" />
      ) : (
        <ShownBooks books={books} place={place} />
      )}
    </>
  );
}

// The books of the chosen filter, one card each, with the foot that reads
// more, or the way back to all of them when the filter holds none.
function ShownBooks({
  books,
  place,
}: {
  books: ReturnType<typeof useChildBooks>;
  place: ReturnType<typeof useHomePlace>;
}) {
  const touch = usePointerCoarse();
  const [now] = useState(() => new Date());
  const shown = (books.data?.pages ?? []).flatMap((page) => page.books);
  if (shown.length === 0)
    return (
      <div className={styles.none}>
        <p>这里还没有书</p>
        <RaisedButton onClick={() => place.choose()}>看全部的书</RaisedButton>
      </div>
    );
  return (
    <>
      <div className={styles.books}>
        {shown.map((book) => (
          <ChildBookCard
            key={book.id}
            book={book}
            open={place.open === book.id}
            onToggle={() => place.toggle(book.id)}
            now={now}
          />
        ))}
      </div>
      <BookListFoot
        state={footState(books)}
        touch={touch}
        onMore={() => void books.fetchNextPage()}
      />
    </>
  );
}
