import { useSyncExternalStore } from 'react';

// Whether a CSS media query matches now, following it as the window changes.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (changed) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', changed);
      return () => media.removeEventListener('change', changed);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
