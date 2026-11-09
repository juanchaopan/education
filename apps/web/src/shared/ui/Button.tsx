import type { ButtonHTMLAttributes } from 'react';
import { classNames } from '../lib/class-names';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  // primary carries the step a card is for, secondary switches between views,
  // text is for small actions beside other content, and danger is only for
  // the last step of an action that cannot be undone.
  variant?: ButtonVariant;
  // A regular weight lets the button read as part of the message it sits in.
  weight?: 'bold' | 'regular';
  // Only a form's own action submits it; every other button is a plain button,
  // so pressing one never sends a form by accident.
  type?: 'button' | 'submit';
  // Places the button in its parent's layout, such as its margins.
  className?: string;
};

export function Button({
  variant = 'primary',
  weight = 'bold',
  type = 'button',
  className,
  ...button
}: Props) {
  return (
    <button
      {...button}
      type={type}
      className={classNames(
        styles.button,
        styles[variant],
        weight === 'regular' && styles.regular,
        className,
      )}
    />
  );
}
