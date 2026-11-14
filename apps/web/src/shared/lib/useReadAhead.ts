import { useEffect, useRef } from 'react';
import { useLatest } from './useLatest';

// How far ahead of the bottom of the screen the next batch is read.
const ahead = '0px 0px 100% 0px';

// Calls `onNear` whenever the element the returned ref is put on comes within
// about a screen of the bottom, while `active`: a list read batch by batch
// reads its next batch this way before the reader reaches its end.
export function useReadAhead<E extends Element>(active: boolean, onNear: () => void) {
  const target = useRef<E>(null);
  const near = useLatest(onNear);
  useEffect(() => {
    const element = target.current;
    if (!active || !element || typeof IntersectionObserver === 'undefined') return;
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) near.current();
      },
      { rootMargin: ahead },
    );
    watcher.observe(element);
    return () => watcher.disconnect();
  }, [active, near]);
  return target;
}
