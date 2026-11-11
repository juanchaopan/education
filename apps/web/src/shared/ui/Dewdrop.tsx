import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { classNames } from '../lib/class-names';
import { Icon } from './Icon';
import type { IconName } from './icons';
import styles from './Dewdrop.module.css';

// Clear glass, or the colour of what the drop means: green to agree, honey to
// try again, clay for the microphone.
export type DewdropTone = 'clear' | 'ok' | 'honey' | 'clay';

// A drop as small as a finger can reliably hit, the size of the tools, or the
// larger size of the microphone and the answer's own drops.
export type DewdropSize = 'small' | 'regular' | 'large';

type Props = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'className' | 'children' | 'aria-label'
> & {
  // What the drop holds: an icon from the set, or, where none fits, a small
  // drawing of its own, such as a number or fireflies.
  icon?: IconName;
  art?: ReactNode;
  // A drop shows no words, so it always needs a name for screen readers.
  // When it carries a badge, the name says what the badge shows.
  label: string;
  tone?: DewdropTone;
  size?: DewdropSize;
  // A small round mark on the drop's shoulder, such as how many are left;
  // it is only drawn, and the name carries its meaning.
  badge?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

// A round glass button laid into a lesson's painting: a highlight where the
// light catches it, a darker depth below, and its icon or drawing inside. It
// sinks back from a press and springs out again.
export function Dewdrop({
  icon,
  art,
  label,
  tone = 'clear',
  size = 'regular',
  badge,
  ...button
}: Props) {
  return (
    <button
      {...button}
      type="button"
      aria-label={label}
      className={classNames(styles.drop, styles[tone], styles[size])}
    >
      {icon ? <Icon name={icon} /> : art}
      {badge !== undefined && (
        <span className={styles.badge} aria-hidden="true">
          {badge}
        </span>
      )}
    </button>
  );
}
