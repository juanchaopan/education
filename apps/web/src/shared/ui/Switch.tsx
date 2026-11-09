import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Switch.module.css';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role' | 'className' | 'children' | 'onChange'
> & {
  label: ReactNode;
  onChange: (on: boolean) => void;
};

// A setting that is on or off. It is a native checkbox announced as a switch,
// so it keeps the browser's own keyboard and form handling, and the whole
// label toggles it, so the label is the touch target.
export function Switch({ label, onChange, ...input }: Props) {
  return (
    <label className={styles.switch}>
      <input
        {...input}
        type="checkbox"
        role="switch"
        className={styles.track}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
