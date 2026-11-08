import type { InputHTMLAttributes, ReactNode } from 'react';
import { Hint } from './Hint';
import styles from './Field.module.css';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'className' | 'aria-describedby' | 'children'
> & {
  id: string;
  label: ReactNode;
  // Read out with the field, so a screen reader hears what it accepts.
  hint?: ReactNode;
};

// The label, the input and its hint are siblings in the form, so the form's
// spacing lays them out the same as every other field.
export function TextField({ id, label, hint, ...input }: Props) {
  const hintId = `${id}-hint`;
  return (
    <>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...input}
        id={id}
        className={styles.input}
        aria-describedby={hint ? hintId : undefined}
      />
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </>
  );
}
