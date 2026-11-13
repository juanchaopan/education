import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import styles from './ForgotPin.module.css';

// 忘了 PIN opens a line under the card's foot saying who can help, and closes
// it again; the child stays on the sign-in.
export function ForgotPin() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="text"
        aria-expanded={open}
        aria-controls="forgot-pin-help"
        onClick={() => setOpen(!open)}
      >
        忘了 PIN
      </Button>
      <p id="forgot-pin-help" className={styles.help} hidden={!open}>
        请家长在家长空间帮你重置。
      </p>
    </>
  );
}
