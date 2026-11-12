import { Link } from 'react-router-dom';
import type { PracticeBook } from '@education/contracts';
import { problemPath } from '../../../shared/lib/problem-path';
import { BookCover } from '../../../shared/ui/BookCover';
import { Icon } from '../../../shared/ui/Icon';
import { Spoken } from '../../../shared/ui/Spoken';
import { ProgressPill } from './ProgressPill';
import styles from './PracticeBooks.module.css';

// A child's practice, book by book: each book's cover, name, grade and
// subject and how far the child has come, then every problem in it in order,
// a tick after each one done. A book that is unavailable is greyed and says
// so; its problems are listed but cannot be opened.
export function PracticeBooks({ books }: { books: readonly PracticeBook[] }) {
  return (
    <div className={styles.books}>
      {books.map((book) => {
        const unavailable = book.status === 'unavailable';
        return (
          <section
            key={book.id}
            aria-labelledby={`practice-book-${book.id}`}
            className={styles.book}
            data-unavailable={unavailable || undefined}
          >
            <div className={styles.head}>
              <BookCover
                subject={book.subject}
                grade={book.grade}
                cover={book.cover}
                size="thumb"
                unavailable={unavailable}
              />
              <div className={styles.text}>
                <h3 id={`practice-book-${book.id}`} className={styles.name}>
                  {book.name}
                </h3>
                <span className={styles.detail}>
                  {book.grade} · {book.subject}
                </span>
              </div>
              <ProgressPill done={book.done} total={book.problems} unavailable={unavailable} />
            </div>
            <ol className={styles.problems}>
              {book.items.map(({ id, version, title, done }) => (
                <li key={id} className={styles.problem}>
                  {unavailable ? (
                    <span className={styles.title}>{title}</span>
                  ) : (
                    <Link to={problemPath(id, version)} className={styles.title}>
                      {title}
                    </Link>
                  )}
                  {done && (
                    <>
                      <Icon name="check" className={styles.tick} />
                      <Spoken>做完了</Spoken>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
