import { useEffect, useRef, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ChildBook } from '@education/contracts';
import { problemPath } from '../../../shared/lib/problem-path';
import { BookCover } from '../../../shared/ui/BookCover';
import { Icon } from '../../../shared/ui/Icon';
import { ProgressBar } from '../../../shared/ui/ProgressBar';
import { RaisedButton } from '../../../shared/ui/RaisedButton';
import { Spoken } from '../../../shared/ui/Spoken';
import { bookWhen } from './book-when';
import styles from './ChildBookCard.module.css';

type Props = {
  book: ChildBook;
  open: boolean;
  onToggle: () => void;
  // Now, by this device's clock, for saying when the book was studied.
  now: Date;
};

type Press = 'keyboard' | 'pointer';

function progressWords({ status, done, problems }: ChildBook) {
  if (status === 'unavailable') return '暂时不可用';
  return problems > 0 && done === problems ? '学完' : `${done} / ${problems}`;
}

// After the child opens or closes a book, what the card does once it has
// redrawn: opening by keyboard moves to the first problem, and closing a book
// whose top has gone above the screen brings it back into view.
function useAfterToggle(open: boolean) {
  const card = useRef<HTMLElement>(null);
  const pressed = useRef<Press | null>(null);
  useEffect(() => {
    const shown = card.current;
    const how = pressed.current;
    pressed.current = null;
    if (!shown || how === null) return;
    if (open && how === 'keyboard') shown.querySelector<HTMLElement>('ol a')?.focus();
    if (!open && shown.getBoundingClientRect().top < 0) shown.scrollIntoView({ block: 'start' });
  }, [open]);
  return {
    card,
    pressedBy: (how: Press) => {
      pressed.current = how;
    },
  };
}

// One book on the child's home, a raised card. Closed, the whole card opens
// it, and its last row says how many problems it holds; open, the problems
// grow out below the book one to a row and that row, now 收起, moves below
// them, so the card has one way to close and the book itself no longer
// closes it. A book that cannot be opened now shows its problems greyed, not
// as links.
export function ChildBookCard({ book, open, onToggle, now }: Props) {
  const { card, pressedBy } = useAfterToggle(open);
  const toggle = useRef<HTMLButtonElement>(null);
  const unavailable = book.status === 'unavailable';
  const listId = `book-${book.id}-problems`;
  const press = (event: MouseEvent<HTMLElement>) => {
    if (open && !toggle.current?.contains(event.target as Node)) return;
    pressedBy(event.detail === 0 ? 'keyboard' : 'pointer');
    onToggle();
  };
  const label = open
    ? `收起${book.name}`
    : `${book.name}，${book.fresh ? '新书，' : ''}${progressWords(book)}，全部 ${book.problems} 道`;
  return (
    <article
      ref={card}
      className={styles.card}
      data-open={open || undefined}
      data-unavailable={unavailable || undefined}
      onClick={press}
    >
      <BookHead book={book} now={now} />
      {open && (
        <ol id={listId} className={styles.list}>
          {book.items.map((item, place) => (
            <li key={`${item.id}/${item.version}`}>
              <ProblemRow
                place={place + 1}
                title={item.title}
                done={item.done}
                to={unavailable ? undefined : problemPath(item.id, item.version)}
              />
            </li>
          ))}
        </ol>
      )}
      <RaisedButton
        ref={toggle}
        shape="block"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
      >
        {open ? '收起' : `全部 ${book.problems} 道`}
        <Icon name="expand" className={styles.arrow} />
      </RaisedButton>
    </article>
  );
}

// The book itself: its standing cover, a red 新 while it is new, its name,
// its grade, subject and when it was studied, and its progress.
function BookHead({ book, now }: { book: ChildBook; now: Date }) {
  const unavailable = book.status === 'unavailable';
  return (
    <div className={styles.head}>
      <div className={styles.cover}>
        <BookCover
          subject={book.subject}
          grade={book.grade}
          cover={book.cover}
          size="standing"
          unavailable={unavailable}
        />
        {book.fresh && (
          <span className={styles.fresh} aria-hidden="true">
            新
          </span>
        )}
      </div>
      <div className={styles.meta}>
        <h3 className={styles.title}>{book.name}</h3>
        <p className={styles.line}>
          {book.grade} · {book.subject} · {bookWhen(book, now)}
        </p>
        <ProgressBar done={book.done} total={book.problems} unavailable={unavailable} />
      </div>
    </div>
  );
}

// One problem of the book: its place, its title in full, a tick once done,
// and an arrow to open it; greyed and not a link when it cannot be opened.
function ProblemRow({
  place,
  title,
  done,
  to,
}: {
  place: number;
  title: string;
  done: boolean;
  to?: string;
}) {
  const body = (
    <>
      <span className={styles.place}>{place}</span>
      <span className={styles.name}>{title}</span>
      {done && (
        <span className={styles.done}>
          <Icon name="check" />
          <Spoken>做完了</Spoken>
        </span>
      )}
    </>
  );
  if (!to)
    return (
      <span className={styles.row} aria-disabled="true">
        {body}
        <Spoken>暂时不可用</Spoken>
      </span>
    );
  return (
    <Link to={to} className={styles.row}>
      {body}
      <Icon name="chevron" className={styles.go} />
    </Link>
  );
}
