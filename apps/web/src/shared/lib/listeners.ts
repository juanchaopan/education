// The listeners of a small store kept outside React: `subscribe` is what
// `useSyncExternalStore` takes, and `notify` tells every listener the store
// has changed.
export function createListeners() {
  const listeners = new Set<() => void>();
  return {
    notify: () => listeners.forEach((listener) => listener()),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
