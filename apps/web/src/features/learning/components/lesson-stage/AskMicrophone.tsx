import { classNames } from '../../../../shared/lib/class-names';
import { Dewdrop } from '../../../../shared/ui/Dewdrop';
import { useHoldPress } from '../../interaction/useHoldPress';
import styles from './AskMicrophone.module.css';

type Props = {
  label: string;
  // Whether the child is holding it to speak, which the rings round it show.
  holding: boolean;
  disabled?: boolean;
  onPress: () => void;
  onRelease: () => void;
};

// The large clay microphone drop the child holds down to speak and lets go of
// when done.
export function AskMicrophone({ label, holding, disabled, onPress, onRelease }: Props) {
  const drop = useHoldPress<HTMLButtonElement>({ onPress, onRelease, disabled });
  return (
    <span
      className={classNames(styles.microphone, holding && styles.holding)}
      data-holding={holding || undefined}
    >
      <Dewdrop ref={drop} icon="mic" tone="clay" size="large" label={label} disabled={disabled} />
    </span>
  );
}
