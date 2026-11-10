import { useSyncExternalStore } from 'react';
import { lessonPreferences, type LessonPreferenceStore } from './lesson-preferences';

// The captions and sound the child chose on this device. Without sound the
// captions are the only way to follow the lesson, so they show whatever the
// child chose for them; turning the sound back on brings that choice back.
export function useLessonPreferences(store: LessonPreferenceStore = lessonPreferences) {
  const { captions, sound } = useSyncExternalStore(store.subscribe, store.read, store.read);
  return {
    sound,
    captions: captions || !sound,
    toggleSound: () => store.change({ sound: !sound }),
    toggleCaptions: () => store.change({ captions: !captions }),
  };
}
