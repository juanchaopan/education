import { useSyncExternalStore } from 'react';

// Less than this is the browser's own bars coming and going, not a keyboard.
const smallestKeyboard = 120;

function inset() {
  const view = globalThis.visualViewport;
  if (!view) return 0;
  const covered = Math.round(globalThis.innerHeight - view.height - view.offsetTop);
  return covered >= smallestKeyboard ? covered : 0;
}

function subscribe(changed: () => void) {
  const view = globalThis.visualViewport;
  view?.addEventListener('resize', changed);
  view?.addEventListener('scroll', changed);
  return () => {
    view?.removeEventListener('resize', changed);
    view?.removeEventListener('scroll', changed);
  };
}

// How much of the bottom of the page an on-screen keyboard covers, in CSS
// pixels, or 0 while there is none. Phones show the keyboard over the page
// rather than shrinking it, and only the visual viewport tells how far up it
// reaches, so a field the child types into can sit just above it.
export function useKeyboardInset() {
  return useSyncExternalStore(subscribe, inset, () => 0);
}
