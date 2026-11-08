import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Checkbox.module.css';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className' | 'children' | 'onChange'
> & {
  label: ReactNode;
  onChange: (checked: boolean) => void;
};

// The whole label toggles the box, so the label is the touch target.
export function Checkbox({ label, onChange, ...input }: Props) {
  return (
    <label className={styles.checkbox}>
      <input
        {...input}
        type="checkbox"
        className={styles.box}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
