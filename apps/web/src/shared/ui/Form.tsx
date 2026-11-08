import type { FormEvent, FormHTMLAttributes } from 'react';
import { classNames } from '../lib/class-names';
import styles from './Form.module.css';

type Props = Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'className'> & {
  // The page decides what submitting means; the browser never navigates away.
  onSubmit: () => void;
  // Places the form in its parent's layout, such as its margins.
  className?: string;
};

// Stacks its fields, hints and buttons one under another at an even spacing.
export function Form({ onSubmit, className, ...form }: Props) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return <form {...form} onSubmit={submit} className={classNames(styles.form, className)} />;
}
