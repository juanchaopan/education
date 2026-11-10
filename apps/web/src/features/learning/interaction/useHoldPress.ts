import { useEffect, useRef } from 'react';
import { useLatest } from '../../../shared/lib/useLatest';
import { bindHoldPress } from './hold-press';

type Hold = {
  onPress: () => void;
  onRelease: () => void;
  // A disabled button hears no letting go, so being disabled ends any hold.
  disabled?: boolean;
};

// Makes the button behind the returned ref one the child holds down to speak
// and lets go of when done, with the mouse, a finger, or Space or Enter.
export function useHoldPress<Element extends HTMLElement>({ onPress, onRelease, disabled }: Hold) {
  const element = useRef<Element>(null);
  const binding = useRef<ReturnType<typeof bindHoldPress>>(undefined);
  const hold = useLatest({ onPress, onRelease });
  useEffect(() => {
    const bound = bindHoldPress(element.current!, {
      press: () => hold.current.onPress(),
      release: () => hold.current.onRelease(),
    });
    binding.current = bound;
    return bound.unbind;
  }, [hold]);
  useEffect(() => {
    if (disabled) binding.current?.letGo();
  }, [disabled]);
  return element;
}
