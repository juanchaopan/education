import { useEffect, useRef } from 'react';
import { useLatest } from '../../../shared/lib/useLatest';
import { bindHoldPress } from '../interaction/hold-press';
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

// A button the child holds down to speak and lets go of when done, with the
// mouse, a finger, or Space or Enter. A disabled button hears no letting go,
// so being disabled ends any hold.
export function HoldToTalkButton({ label, holding, disabled, onPress, onRelease }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const binding = useRef<ReturnType<typeof bindHoldPress>>(undefined);
  const hold = useLatest({ onPress, onRelease });
  useEffect(() => {
    const bound = bindHoldPress(button.current!, {
      press: () => hold.current.onPress(),
      release: () => hold.current.onRelease(),
    });
    binding.current = bound;
    return bound.unbind;
  }, [hold]);
  useEffect(() => {
    if (disabled) binding.current?.letGo();
  }, [disabled]);
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
