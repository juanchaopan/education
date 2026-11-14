import { useSyncExternalStore } from 'react';

const query = '(pointer: coarse)';

function media() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query) : undefined;
}

function subscribe(changed: () => void) {
  const list = media();
  list?.addEventListener('change', changed);
  return () => list?.removeEventListener('change', changed);
}

// Whether the device is used mainly by touch, such as a phone or a tablet,
// rather than with a mouse; it follows a tablet docked to a keyboard and
// back. Without a way to ask, the device counts as one with a mouse.
export function usePointerCoarse() {
  return useSyncExternalStore(subscribe, () => media()?.matches ?? false);
}
