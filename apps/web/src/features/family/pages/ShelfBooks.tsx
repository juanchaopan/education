import { useRef, useState } from 'react';
import type { ChildAccess, ChildShelfBook, FamilyShelfBook } from '@education/contracts';
import { AssignToggle } from '../../../shared/ui/AssignToggle';
import { BookCard } from '../../../shared/ui/BookCard';
import { ProgressTag } from '../../../shared/ui/ProgressTag';
import { ChildChooser } from '../components/ChildChooser';
import {
  useAnyBookGiven,
  useBookToggles,
  useChildShelf,
  useFamilyShelf,
  useRefreshShelves,
  type BookChange,
  type BookFailure,
} from '../data-access/useBookshelf';
import type { ShelfFilter } from '../model';
import { ShelfView, type ShelfEmpty } from './ShelfView';
import styles from './ShelfPage.module.css';

type Shelf = Readonly<{
  csrf: string;
  filter: ShelfFilter;
  onFilter: (filter: ShelfFilter) => void;
}>;

// A note under a card for the change of this book that did not go through,
// for one child or, without a child, for any.
function failureNote(failure: BookFailure | null, bookId: string, childId?: string) {
  if (!failure || failure.bookId !== bookId || (childId && failure.childId !== childId))
    return undefined;
  return (
    <p role="alert" className={styles.note}>
      {failure.message}
    </p>
  );
}

// An empty library says whether the catalogue has no books yet, which is so
// when no book was given to the family either, or every book has been given;
// it says nothing until the family shelf has answered, and says so when that
// shelf did not open.
function useLibraryEmpty(
  csrf: string,
  empty: boolean,
  onFamily: () => void,
): ShelfEmpty | undefined {
  const given = useAnyBookGiven(csrf, empty);
  if (given.isError)
    return {
      icon: 'wifiOff',
      title: '书架没打开',
      description: given.error.message,
      actionLabel: '再试一次',
      onAction: () => void given.refetch(),
    };
  if (given.data === undefined) return undefined;
  if (given.data === false)
    return { title: '书在路上', description: '题库里还没有书，新书会陆续放上来。' };
  return {
    title: '书库里的书都安排出去了',
    description: '安排给孩子的书都在「我的家庭」里。',
    actionLabel: '看我的家庭',
    onAction: onFamily,
  };
}

// The library or the family shelf. Each book's button opens the list of the
// family's children. Once the list has closed and every switch pressed in it
// has had its answer, the shelves are read again, so a book given away leaves
// the library and one every child gave back returns. A family without
// children browses the library without buttons.
export function FamilyBooks({
  csrf,
  shelf,
  family,
  filter,
  onFilter,
  onShelf,
}: Shelf & {
  shelf: 'library' | 'family';
  family: readonly ChildAccess[];
  onShelf: (shelf: 'library' | 'family') => void;
}) {
  const query = useFamilyShelf(csrf, shelf, filter);
  const toggles = useBookToggles(csrf);
  const refresh = useRefreshShelves(csrf);
  const [open, setOpen] = useState<string | null>(null);
  const pressed = useRef<Promise<void>[]>([]);
  const libraryEmpty = useLibraryEmpty(
    csrf,
    shelf === 'library' && query.data?.pages[0]?.total === 0,
    () => onShelf('family'),
  );
  const empty: ShelfEmpty | undefined =
    shelf === 'library'
      ? libraryEmpty
      : {
          title: '还没有给孩子安排书',
          description: '在书库里挑一本书，安排给孩子。',
          actionLabel: '去书库挑书',
          onAction: () => onShelf('library'),
        };
  const nickname = new Map(
    family.map((child, place) => [child.id, { name: child.nickname, place }]),
  );
  const toggle = (change: BookChange) => {
    pressed.current.push(toggles.toggle(change));
  };
  const close = () => {
    setOpen(null);
    const changes = pressed.current;
    pressed.current = [];
    if (changes.length) void Promise.all(changes).then(() => refresh(shelf));
  };
  const card = (book: FamilyShelfBook) => {
    const given = book.children.filter(({ assigned }) => assigned);
    return (
      <BookCard
        book={book}
        corner="bottom"
        marks={
          given.length > 0 &&
          given.map(({ childId, done }) => (
            <ProgressTag
              key={childId}
              done={done}
              total={book.problems}
              child={nickname.get(childId)}
            />
          ))
        }
        action={
          family.length > 0 && (
            <ChildChooser
              book={book}
              open={open === book.id}
              onOpen={() => setOpen(book.id)}
              onClose={close}
              onToggle={(childId, assign) => toggle({ childId, bookId: book.id, assign })}
              family={book.children.map(({ childId, assigned, done }) => ({
                childId,
                nickname: nickname.get(childId)?.name ?? '',
                place: nickname.get(childId)?.place ?? 0,
                assigned,
                done,
                pending: toggles.isPending(childId, book.id),
              }))}
            />
          )
        }
        note={failureNote(toggles.failure, book.id)}
      />
    );
  };
  return (
    <ShelfView
      shelf={query}
      filter={filter}
      byState={false}
      onFilter={onFilter}
      empty={empty}
      card={card}
    />
  );
}

// One child's shelf: every book that can be given and those the child has,
// each with the child's own switch, and the child's progress in the top
// right of a book the child has or has done problems in.
export function ChildBooks({ csrf, child, filter, onFilter }: Shelf & { child: ChildAccess }) {
  const query = useChildShelf(csrf, child.id, filter);
  const toggles = useBookToggles(csrf);
  const card = (book: ChildShelfBook) => (
    <BookCard
      book={book}
      corner="top"
      marks={
        (book.assigned || book.done > 0) && <ProgressTag done={book.done} total={book.problems} />
      }
      action={
        <AssignToggle
          assigned={book.assigned}
          unavailable={book.status === 'unavailable'}
          pending={toggles.isPending(child.id, book.id)}
          child={child.nickname}
          book={book.name}
          onToggle={() =>
            void toggles.toggle({ childId: child.id, bookId: book.id, assign: !book.assigned })
          }
        />
      }
      note={failureNote(toggles.failure, book.id, child.id)}
    />
  );
  return (
    <ShelfView
      shelf={query}
      filter={filter}
      byState
      onFilter={onFilter}
      empty={{ title: '书在路上', description: '题库里还没有书，新书会陆续放上来。' }}
      card={card}
    />
  );
}
