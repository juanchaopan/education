import type { ReactNode, SelectHTMLAttributes } from 'react';
import styles from './Field.module.css';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & {
  id: string;
  label: ReactNode;
  children: ReactNode;
};

// The label and the list are siblings, so the container that holds them sets
// how far apart they sit.
export function SelectField({ id, label, children, ...select }: Props) {
  return (
    <>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select {...select} id={id} className={styles.select}>
        {children}
      </select>
    </>
  );
}
