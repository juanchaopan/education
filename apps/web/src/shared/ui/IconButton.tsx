import type { ButtonHTMLAttributes } from 'react';
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
};

export function IconButton({ icon, label, ...button }: Props) {
  return (
    <button {...button} type="button" aria-label={label} className={styles.button}>
      <Icon name={icon} />
    </button>
  );
}
