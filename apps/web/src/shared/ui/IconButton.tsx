import type { ButtonHTMLAttributes } from 'react';
import { classNames } from '../lib/class-names';
import { Icon } from './Icon';
import type { IconName } from './icons';
import styles from './IconButton.module.css';

type Props = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'className' | 'children' | 'aria-label'
> & {
  icon: IconName;
  // A button with only an icon still needs a name for screen readers.
  label: string;
  // Frosted glass in place of a card, for a button laid over a picture.
  glass?: boolean;
};

export function IconButton({ icon, label, glass = false, ...button }: Props) {
  return (
    <button
      {...button}
      type="button"
      aria-label={label}
      className={classNames(styles.button, glass && styles.glass)}
    >
      <Icon name={icon} />
    </button>
  );
}
