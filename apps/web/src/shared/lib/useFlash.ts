import { useEffect, useState } from 'react';

// Whether something that just happened is still worth showing: true from the
// render that brings a new `moment` until `ms` later, then false until the
// next one. A moment is any value that changes each time the thing happens,
// such as a count or a fresh object; `undefined` means nothing has happened.
export function useFlash(moment: unknown, ms: number) {
  const [past, setPast] = useState<unknown>();
  useEffect(() => {
    if (moment === undefined) return;
    const timer = setTimeout(() => setPast(moment), ms);
    return () => clearTimeout(timer);
  }, [moment, ms]);
  return moment !== undefined && past !== moment;
}
