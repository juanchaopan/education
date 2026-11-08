import type { HTMLAttributes } from 'react';
import { classNames } from '../lib/class-names';
import styles from './Card.module.css';

type Props = Omit<HTMLAttributes<HTMLElement>, 'className'> & {
  // A flat card lies on the page without a shadow and tightens its padding on
  // narrow screens, for a large area that holds other content.
  flat?: boolean;
  // Places the card in its parent's layout, such as the space above it.
  className?: string;
};

// A section of the page on its own surface. Name it with aria-labelledby
// pointing at its heading, so it is a region screen readers can jump to.
export function Card({ flat, className, ...section }: Props) {
  return (
    <section
      {...section}
      className={classNames(styles.card, flat ? styles.flat : styles.raised, className)}
    />
  );
}
