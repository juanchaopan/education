import type { ReactNode } from 'react';
import { coverImage } from '../media/covers/covers';
import { Icon } from './Icon';
import { subjectLook } from './subject-looks';
import styles from './BookCover.module.css';

type Props = {
  subject: string;
  grade: string;
  // The id of the book's painted cover, or null for none.
  cover: string | null;
  // A card's cover carries the grade label and the unavailable band; a
  // thumbnail beside a row of text carries neither, as the row says both.
  size?: 'card' | 'thumb';
  unavailable?: boolean;
  // Marks laid on the cover, such as progress, and the corner they sit in:
  // the top right for one child's progress, the bottom right for several.
  marks?: ReactNode;
  corner?: 'top' | 'bottom';
};

// A book's 3:4 cover with the shading of its spine down the left edge: its
// painted cover, or, without one, its subject's colours and icon with the
// grade on a paper label in the top left, leaving the right corners for
// progress. Painted covers download only when they come into view. The book's
// name is always written beside the cover, so the picture is decoration.
export function BookCover({
  subject,
  grade,
  cover,
  size = 'card',
  unavailable,
  marks,
  corner = 'top',
}: Props) {
  const image = coverImage(cover);
  const look = subjectLook(subject);
  return (
    <div className={styles.cover} data-size={size} data-unavailable={unavailable || undefined}>
      {image ? (
        <img className={styles.picture} src={image} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className={styles.drawn} data-tone={look.tone} aria-hidden="true">
          <Icon name={look.icon} className={styles.icon} />
          {size === 'card' && <span className={styles.grade}>{grade}</span>}
        </div>
      )}
      {unavailable && size === 'card' && <span className={styles.band}>暂时不可用</span>}
      {marks && (
        <span className={styles.marks} data-corner={corner}>
          {marks}
        </span>
      )}
    </div>
  );
}
