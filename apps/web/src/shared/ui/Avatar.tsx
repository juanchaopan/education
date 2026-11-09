import { classNames } from '../lib/class-names';
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
  className?: string;
};

// A round clay disc with the first character of a name. The name itself is
// always written beside it, so the disc is decoration.
export function Avatar({ name, place = 0, className }: Props) {
  const initial = (Array.from(name.trim())[0] ?? '?').toUpperCase();
  return (
    <span
      aria-hidden="true"
      data-tone={tones[place % tones.length]}
      className={classNames(styles.avatar, className)}
    >
      {initial}
    </span>
  );
}
