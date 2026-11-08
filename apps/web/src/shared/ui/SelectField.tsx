import type { ReactNode, SelectHTMLAttributes } from 'react';
import { classNames } from '../lib/class-names';
import styles from './Field.module.css';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & {
  id: string;
  label: ReactNode;
  // A list that steers the page, such as a catalog filter, shows its label in
  // the accent ink and its chosen value in bold.
  emphasis?: boolean;
  children: ReactNode;
};

// The label and the list are siblings, so the container that holds them sets
// how far apart they sit.
export function SelectField({ id, label, emphasis, children, ...select }: Props) {
  return (
    <>
      <label htmlFor={id} className={classNames(styles.label, emphasis && styles.emphasisLabel)}>
        {label}
      </label>
      <select
        {...select}
        id={id}
        className={classNames(styles.select, emphasis && styles.emphasisValue)}
      >
        {children}
      </select>
    </>
  );
}
