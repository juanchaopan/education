import { useHoldPress } from '../interaction/useHoldPress';
import action from './LessonAction.module.css';
import styles from './HoldToTalkButton.module.css';

type Props = {
  label: string;
  // Whether the child is holding it to speak, which it shows.
  holding: boolean;
  disabled?: boolean;
  onPress: () => void;
  onRelease: () => void;
};

// A button the child holds down to speak and lets go of when done.
export function HoldToTalkButton({ label, holding, disabled, onPress, onRelease }: Props) {
  const button = useHoldPress<HTMLButtonElement>({ onPress, onRelease, disabled });
  return (
    <button
      ref={button}
      type="button"
      className={`${action.button} ${styles.hold}`}
      data-holding={holding || undefined}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
