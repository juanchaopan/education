type Store = Pick<Storage, 'getItem' | 'setItem'>;

const key = 'education.release-reload';

// The release this tab last reloaded itself for, kept in the tab's session
// storage so it outlives the reload. A tab reloads on its own at most once for
// each release; a tab that cannot keep the record never reloads on its own.
export function createReloadGuard(store: () => Store = () => sessionStorage) {
  return {
    // What the tab recorded before this page loaded: the release it reloaded
    // for, and whether it can record another reload. Writing the record back
    // as it is shows whether it can.
    read() {
      try {
        const reloadedFor = store().getItem(key);
        store().setItem(key, reloadedFor ?? '');
        return { reloadedFor, recordable: true };
      } catch {
        return { reloadedFor: null, recordable: false };
      }
    },
    // Records the reload about to happen. A record that cannot be written
    // now is found out by `read` once the page has loaded again, so that
    // page never reloads on its own.
    mark(release: string) {
      try {
        store().setItem(key, release);
      } catch {
        // `read` on the next page load sees the same failure.
      }
    },
  };
}

export type ReloadGuard = ReturnType<typeof createReloadGuard>;
