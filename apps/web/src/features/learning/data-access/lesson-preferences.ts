import { createListeners } from '../../../shared/lib/listeners';

// How the child likes lessons to sound and read on this device: the teacher's
// voice on or off, and the narrated lines' captions on or off. They are kept
// in the browser, so every lesson and every later visit start the same way,
// and are never sent anywhere.
export type LessonPreferences = Readonly<{ captions: boolean; sound: boolean }>;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const key = 'lesson-preferences';
const usual: LessonPreferences = { captions: true, sound: true };

function parse(raw: string | null): LessonPreferences {
  try {
    const kept = JSON.parse(raw ?? 'null') as Partial<LessonPreferences> | null;
    return { captions: kept?.captions !== false, sound: kept?.sound !== false };
  } catch {
    return usual;
  }
}

function load(storage: Storage | undefined) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

// The preferences in `storage`, parsed again only when what is stored changes,
// so a reader always gets the same object for the same preferences. When the
// browser refuses to store them, they are kept for this visit instead.
export function createLessonPreferences(storage: Storage | undefined) {
  let visit: string | undefined;
  let raw: string | null = null;
  let current = usual;
  const { notify, subscribe } = createListeners();
  return {
    read() {
      const now = visit ?? load(storage);
      if (now !== raw) {
        raw = now;
        current = parse(now);
      }
      return current;
    },
    change(next: Partial<LessonPreferences>) {
      const wanted = JSON.stringify({ ...current, ...next });
      try {
        storage?.setItem(key, wanted);
        visit = storage ? undefined : wanted;
      } catch {
        visit = wanted;
      }
      notify();
    },
    subscribe,
  };
}

export type LessonPreferenceStore = ReturnType<typeof createLessonPreferences>;

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export const lessonPreferences = createLessonPreferences(browserStorage());
