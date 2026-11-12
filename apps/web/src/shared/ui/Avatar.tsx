import { initialOf } from '../lib/initial';
import styles from './Avatar.module.css';

// The colours avatars take in turn, so the people in a list tell apart at a
// glance. Both carry the primary button's ink, which reads on them in either
// theme.
const tones = ['primary', 'second'] as const;

type Props = {
  // Whose avatar it is; its first character is drawn on the disc.
  name: string;
  // The person's place in their list, which picks the colour.
  place?: number;
  // A small disc sits inside a compact control, such as a link in a row of
  // links; a regular one heads a card or a row of its own.
  size?: 'regular' | 'small';
};

// A round clay disc with the first character of a name. The name itself is
// always written beside it, so the disc is decoration.
export function Avatar({ name, place = 0, size = 'regular' }: Props) {
  return (
    <span
      aria-hidden="true"
      data-tone={tones[place % tones.length]}
      data-size={size}
      className={styles.avatar}
    >
      {initialOf(name)}
    </span>
  );
}
