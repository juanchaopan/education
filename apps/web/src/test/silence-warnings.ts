import { afterEach, beforeEach, vi } from 'vitest';

// Keeps console warnings out of a test file's output while its tests can still
// check them through console.warn.
export function silenceWarnings() {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.mocked(console.warn).mockRestore();
  });
}
