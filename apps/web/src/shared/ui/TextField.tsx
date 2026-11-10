import type { InputHTMLAttributes, ReactNode } from 'react';
import { Hint } from './Hint';
import { Icon } from './Icon';
import type { IconName } from './icons';
import styles from './Field.module.css';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'className' | 'aria-describedby' | 'children'
> & {
  id: string;
  label: ReactNode;
  // Read out with the field, so a screen reader hears what it accepts.
  hint?: ReactNode;
  // Drawn at the start of the input to show at a glance what goes in it.
  icon?: IconName;
};

// The label, the input and its hint are siblings in the form, so the form's
// spacing lays them out the same as every other field.
export function TextField({ id, label, hint, icon, ...input }: Props) {
  const hintId = `${id}-hint`;
  const field = (
    <input
      {...input}
      id={id}
      className={styles.input}
      aria-describedby={hint ? hintId : undefined}
    />
  );
  return (
    <>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {icon ? (
        <span className={styles.withIcon}>
          <Icon name={icon} className={styles.icon} />
          {field}
        </span>
      ) : (
        field
      )}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </>
  );
}
