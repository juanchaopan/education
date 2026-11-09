import { Link, type LinkProps } from 'react-router-dom';
import { classNames } from '../lib/class-names';
import type { ButtonVariant } from './Button';
import styles from './Button.module.css';

type Props = Omit<LinkProps, 'className'> & {
  variant?: Exclude<ButtonVariant, 'danger'>;
  className?: string;
};

// A link that leads to another page but looks like a button, because going
// there is the step the card is for, such as inviting a child. It stays a
// link, so it opens in a new tab and reads as one.
export function LinkButton({ variant = 'primary', className, ...link }: Props) {
  return (
    <Link
      {...link}
      className={classNames(styles.button, styles[variant], styles.link, className)}
    />
  );
}
