import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../../shared/ui/Avatar';
import type { CardBook } from '../../../shared/ui/BookCard';
import { BookCover } from '../../../shared/ui/BookCover';
import { Icon } from '../../../shared/ui/Icon';
import { BookProgress } from './BookProgress';
import styles from './BookRows.module.css';

export type BookRow = Readonly<{
  key: string;
  book: CardBook;
  // Whose book it is and what it is, in a few words.
  detail: string;
  done: number;
  // What can be done with the book here instead of its progress, such as
  // taking back one that is unavailable.
  action?: ReactNode;
}>;

// Books in rows: a small cover, the name and a short detail, and at the end
// the progress as "n / m" over a thin bar, or a green 学完 with a tick. An
// unavailable book's row is greyed and ends in its action instead.
export function BookRows({ rows }: { rows: readonly BookRow[] }) {
  return (
    <ul className={styles.rows}>
      {rows.map(({ key, book, detail, done, action }) => {
        const unavailable = book.status === 'unavailable';
        return (
          <li key={key} className={styles.row} data-unavailable={unavailable || undefined}>
            <BookCover
              subject={book.subject}
              grade={book.grade}
              cover={book.cover}
              size="thumb"
              unavailable={unavailable}
            />
            <span className={styles.text}>
              <span className={styles.name}>{book.name}</span>
              <span className={styles.detail}>{detail}</span>
            </span>
            {action ?? <BookProgress done={done} total={book.problems} />}
          </li>
        );
      })}
    </ul>
  );
}

export type ChildBooksLink = Readonly<{
  childId: string;
  nickname: string;
  place: number;
  count: number;
}>;

// A link for each child to the books the child has, such as 小米已安排 4 本.
export function ChildBooksLinks({
  links,
  to,
}: {
  links: readonly ChildBooksLink[];
  to: (childId: string) => string;
}) {
  return (
    <nav aria-label="每个孩子安排的书" className={styles.links}>
      {links.map(({ childId, nickname, place, count }) => (
        <Link key={childId} to={to(childId)} className={styles.link}>
          <Avatar name={nickname} place={place} size="small" />
          {nickname}已安排 {count} 本
          <Icon name="chevron" />
        </Link>
      ))}
    </nav>
  );
}
