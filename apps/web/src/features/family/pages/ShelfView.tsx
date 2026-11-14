import { Fragment, type ReactNode } from 'react';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { ChildShelfPage, FamilyShelfPage } from '@education/contracts';
import { BookCardPlaceholder } from '../../../shared/ui/BookCard';
import { EmptyState } from '../../../shared/ui/EmptyState';
import type { IconName } from '../../../shared/ui/icons';
import { Loading } from '../../../shared/ui/Loading';
import { footState } from '../components/foot-state';
import { ShelfFilters } from '../components/ShelfFilters';
import { ShelfFoot } from '../components/ShelfFoot';
import { everyBook, type ShelfFilter } from '../model';
import styles from './ShelfPage.module.css';

// A shelf with nothing in it, as its caller describes it; the library's
// icon unless another is named.
export type ShelfEmpty = Readonly<{
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}>;

type Page = FamilyShelfPage | ChildShelfPage;
type Book = Page['books'][number];

type Props<P extends Page> = {
  shelf: UseInfiniteQueryResult<InfiniteData<P>>;
  filter: ShelfFilter;
  byState: boolean;
  onFilter: (filter: ShelfFilter) => void;
  // What an empty shelf says when nothing narrows it, or nothing yet while
  // the caller is still finding out why it is empty.
  empty?: ShelfEmpty;
  card: (book: P['books'][number]) => ReactNode;
};

const firstLoad = Array.from({ length: 10 }, (_, place) => place);
const nextLoad = [0, 1];

// What the current filter is, in words, for a shelf it leaves empty.
function filterWords({ grade, subject, state }: ShelfFilter) {
  const stateWords = { '': '', assigned: ' · 已安排', unassigned: ' · 未安排' }[state];
  return `${grade || '全部年级'} · ${subject || '全部科目'}${stateWords}`;
}

const narrowed = ({ grade, subject, state }: ShelfFilter) => !!(grade || subject || state);

// One shelf read batch by batch: the filters, how many books it holds, the
// books, and its foot. The first batch shows ten placeholder cards while it
// loads; a shelf that did not open says so and offers to try again; an empty
// one says why.
export function ShelfView<P extends Page>({
  shelf,
  filter,
  byState,
  onFilter,
  empty,
  card,
}: Props<P>) {
  if (shelf.isPending)
    return (
      <div className={styles.grid} role="status" aria-label="正在打开书架">
        {firstLoad.map((place) => (
          <BookCardPlaceholder key={place} />
        ))}
      </div>
    );
  if (shelf.isError && !shelf.data)
    return (
      <EmptyState
        icon="wifiOff"
        title="书架没打开"
        description={shelf.error.message}
        actionLabel="再试一次"
        onAction={() => void shelf.refetch()}
      />
    );
  const pages = shelf.data.pages;
  const first = pages[0]!;
  const books = pages.flatMap<Book>((page) => page.books);
  return (
    <>
      <ShelfFilters
        grades={first.grades}
        subjects={first.subjects}
        value={filter}
        byState={byState}
        onChange={onFilter}
      />
      <p className={styles.count}>
        共<b>{first.total}</b>本
      </p>
      {!books.length &&
        (narrowed(filter) ? (
          <EmptyState
            icon="library"
            title="这里还没有书"
            description={filterWords(filter)}
            actionLabel="看全部的书"
            onAction={() => onFilter(everyBook)}
          />
        ) : (
          <WhyEmpty empty={empty} />
        ))}
      {!!books.length && (
        <>
          <div className={styles.grid}>
            {(books as P['books']).map((book) => (
              <Fragment key={book.id}>{card(book)}</Fragment>
            ))}
            {shelf.isFetchingNextPage &&
              nextLoad.map((place) => <BookCardPlaceholder key={place} />)}
          </div>
          <ShelfFoot
            state={footState(shelf)}
            total={first.total}
            onMore={() => void shelf.fetchNextPage()}
          />
        </>
      )}
    </>
  );
}

function WhyEmpty({ empty }: { empty?: ShelfEmpty }) {
  if (!empty) return <Loading label="正在打开书架…" />;
  const { icon = 'library', ...words } = empty;
  return <EmptyState icon={icon} {...words} />;
}
