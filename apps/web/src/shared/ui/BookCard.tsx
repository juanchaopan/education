import type { ReactNode } from 'react';
import type { ChildShelfBook } from '@education/contracts';
import { BookCover } from './BookCover';
import styles from './BookCard.module.css';

export type CardBook = Pick<ChildShelfBook, 'name' | 'grade' | 'subject' | 'cover' | 'status'> & {
  problems: number;
};

type Props = {
  book: CardBook;
  // Progress laid on the cover, and the corner it sits in: the top right for
  // one child, the bottom right for each child of the family who has it.
  marks?: ReactNode;
  corner?: 'top' | 'bottom';
  // What can be done with the book here, at the foot of the card, and a line
  // beneath it, such as why the last press did not go through.
  action?: ReactNode;
  note?: ReactNode;
};

// A book on a shelf: its cover, its name in up to two lines, its grade,
// subject and number of problems, and an action at the foot. A book that is
// unavailable is greyed out, its words in the secondary colour.
export function BookCard({ book, marks, corner, action, note }: Props) {
  const unavailable = book.status === 'unavailable';
  return (
    <article className={styles.card} data-unavailable={unavailable || undefined}>
      <BookCover
        subject={book.subject}
        grade={book.grade}
        cover={book.cover}
        unavailable={unavailable}
        marks={marks}
        corner={corner}
      />
      <h3 className={styles.name}>{book.name}</h3>
      <p className={styles.detail}>
        {book.grade} · {book.subject} · {book.problems} 题
      </p>
      {action && <div className={styles.action}>{action}</div>}
      {note}
    </article>
  );
}

// A card still on its way, while a shelf loads: the shape of a book without
// any of its words.
export function BookCardPlaceholder() {
  return (
    <div className={styles.card} data-placeholder aria-hidden="true">
      <div className={styles.ghostCover} />
      <div className={styles.ghostLine} />
      <div className={styles.ghostLine} data-short />
    </div>
  );
}
