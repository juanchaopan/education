import { useEffect } from 'react';
import { useLatest } from '../../../shared/lib/useLatest';

// Moves the lesson on by itself once `ready`, after `after` milliseconds, so
// the child sees what was done before the next scene comes; nothing moves if
// the part leaves the lesson first.
export function useMoveOn(ready: boolean, move: () => void, after: number) {
  const latest = useLatest(move);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => latest.current(), after);
    return () => clearTimeout(timer);
  }, [ready, after, latest]);
}
