import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Whether a CSS media query matches now, following it as the window changes.
export function useMediaQuery(query: string) {
  const media = useMemo(() => window.matchMedia(query), [query]);
  const subscribe = useCallback(
    (changed: () => void) => {
      media.addEventListener('change', changed);
      return () => media.removeEventListener('change', changed);
    },
    [media],
  );
  return useSyncExternalStore(subscribe, () => media.matches);
}
