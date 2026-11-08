import { useEffect, useRef } from 'react';

// The latest value or callback, for work that outlives the render that
// started it.
export function useLatest<Value>(value: Value) {
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}
