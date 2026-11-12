import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useLatest } from '../../../shared/lib/useLatest';
import { AssignToggle } from '../../../shared/ui/AssignToggle';
import { Avatar } from '../../../shared/ui/Avatar';
import type { CardBook } from '../../../shared/ui/BookCard';
import { BookCover } from '../../../shared/ui/BookCover';
import { Icon } from '../../../shared/ui/Icon';
import { IconButton } from '../../../shared/ui/IconButton';
import { Spoken } from '../../../shared/ui/Spoken';
import styles from './ChildChooser.module.css';

// One child of the family as the list of children shows them for one book.
export type ChooserChild = Readonly<{
  childId: string;
  nickname: string;
  place: number;
  assigned: boolean;
  done: number;
  // The child's switch is waiting for the server.
  pending: boolean;
}>;

type ListProps = {
  book: CardBook;
  family: readonly ChooserChild[];
  // Where the list stands on a wide screen, in page coordinates.
  anchor: Readonly<{ top: number; left: number }>;
  onClose: () => void;
  onToggle: (childId: string, assign: boolean) => void;
  ref?: Ref<HTMLDivElement>;
};

// The list of the family's children for one book: each child with their
// progress in the book and their own switch. On a wide screen it is a small
// raised card at the anchor; on a phone it slides up from the bottom over a
// veil, headed by the book's cover and name and a close button.
export function ChooserList({ book, family, anchor, onClose, onToggle, ref }: ListProps) {
  const unavailable = book.status === 'unavailable';
  return (
    <>
      <div className={styles.scrim} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        tabIndex={-1}
        aria-label={`安排《${book.name}》`}
        className={styles.list}
        style={{ '--top': `${anchor.top}px`, '--left': `${anchor.left}px` } as object}
      >
        <div className={styles.head}>
          <BookCover
            subject={book.subject}
            grade={book.grade}
            cover={book.cover}
            size="thumb"
            unavailable={unavailable}
          />
          <h3 className={styles.title}>{book.name}</h3>
          <IconButton icon="close" label="关闭" onClick={onClose} />
        </div>
        {family.map((child) => (
          <div key={child.childId} className={styles.row}>
            <Avatar name={child.nickname} place={child.place} />
            <span className={styles.name}>{child.nickname}</span>
            {(child.assigned || child.done > 0) && (
              <span className={styles.progress}>
                {child.done}/{book.problems}
              </span>
            )}
            <span className={styles.toggle}>
              <AssignToggle
                assigned={child.assigned}
                unavailable={unavailable}
                pending={child.pending}
                child={child.nickname}
                book={book.name}
                onToggle={() => onToggle(child.childId, !child.assigned)}
              />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

type Area = RefObject<HTMLElement | null>;

// Closes the open list on Escape, on a press outside both the button and the
// list, and when the keyboard focus moves out of both. The listeners stay
// while the list is open, calling whatever the latest close is.
function useDismiss(open: boolean, areas: readonly Area[], close: () => void) {
  const latest = useLatest(close);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!areas.some((area) => area.current?.contains(target))) latest.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, areas, latest]);
}

// The list's room on a wide screen: as wide as 20rem fits beside the edges.
const listWidth = () => Math.min(20 * 16, window.innerWidth - 32);

// Where the list stands on a wide screen: just under the button, as far left
// as the button but never past the right edge of the page.
function useAnchor(open: boolean, trigger: RefObject<HTMLElement | null>) {
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) return;
      const left = Math.max(16, Math.min(box.left, window.innerWidth - listWidth() - 16));
      setAnchor({ top: box.bottom + window.scrollY + 8, left: left + window.scrollX });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, trigger]);
  return anchor;
}

type Props = Omit<ListProps, 'anchor' | 'ref'> & {
  open: boolean;
  onOpen: () => void;
};

// The button under a book on the library and the family shelf, and the list
// of the family's children it opens, however many there are. Pressing a
// switch gives or takes back the book for that child and leaves the list
// open for the next. The list is laid over the whole page, so no card can
// cover it. Escape, the close button or a press outside close it, and the
// focus goes back to the button.
export function ChildChooser({ book, family, open, onOpen, onClose, onToggle }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const areas = useMemo<readonly Area[]>(() => [trigger, list], []);
  const unavailable = book.status === 'unavailable';
  const anchor = useAnchor(open, trigger);
  const close = () => {
    onClose();
    trigger.current?.focus();
  };
  useDismiss(open, areas, close);
  // Opening moves the focus to the first child's switch, or to the list when
  // no child can be switched.
  useEffect(() => {
    const opened = list.current;
    if (open && opened) (opened.querySelector<HTMLElement>('[aria-pressed]') ?? opened).focus();
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        data-state={unavailable ? 'withdrawn' : 'open'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? close() : onOpen())}
      >
        <Icon name={unavailable ? 'close' : 'plus'} />
        {unavailable ? '取消安排' : '安排'}
        <Spoken>《{book.name}》</Spoken>
        <Icon name="expand" />
      </button>
      {open &&
        createPortal(
          <ChooserList
            ref={list}
            book={book}
            family={family}
            anchor={anchor}
            onClose={close}
            onToggle={onToggle}
          />,
          document.body,
        )}
    </>
  );
}
