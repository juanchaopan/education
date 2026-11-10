import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createLessonPreferences } from './lesson-preferences';
import { useLessonPreferences } from './useLessonPreferences';

// A browser's storage, which can refuse to keep anything.
function memory({ refuses = false } = {}) {
  const kept = new Map<string, string>();
  return {
    getItem: (name: string) => kept.get(name) ?? null,
    setItem(name: string, value: string) {
      if (refuses) throw new DOMException('Storage is full', 'QuotaExceededError');
      kept.set(name, value);
    },
  };
}

function preferences(storage = memory()) {
  const store = createLessonPreferences(storage);
  return renderHook(() => useLessonPreferences(store)).result;
}

it('starts with captions and sound on', () => {
  expect(preferences().current).toMatchObject({ captions: true, sound: true });
});

it('keeps what the child chose on the device, for every later lesson', () => {
  const storage = memory();
  const first = preferences(storage);
  act(() => first.current.toggleCaptions());
  expect(first.current.captions).toBe(false);
  expect(preferences(storage).current).toMatchObject({ captions: false, sound: true });
});

it('shows the captions while the sound is off, and brings the choice back with the sound', () => {
  const result = preferences();
  act(() => result.current.toggleCaptions());
  act(() => result.current.toggleSound());
  expect(result.current).toMatchObject({ captions: true, sound: false });
  act(() => result.current.toggleSound());
  expect(result.current).toMatchObject({ captions: false, sound: true });
});

it('keeps the choice for the visit when the browser refuses to store it', () => {
  const result = preferences(memory({ refuses: true }));
  act(() => result.current.toggleSound());
  expect(result.current.sound).toBe(false);
});
