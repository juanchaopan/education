import { afterEach, expect, it, vi } from 'vitest';
import { releaseDelayMs, saveFile } from './save-file';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('downloads the text under the given name and then releases the file from memory', async () => {
  vi.useFakeTimers();
  const create = vi.fn((_blob: Blob) => 'blob:family-data');
  const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  const clicked: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
  saveFile('{"ok":true}', 'family-data-2026-11-07.json');
  expect(clicked).toHaveLength(1);
  expect(clicked[0]!.download).toBe('family-data-2026-11-07.json');
  expect(clicked[0]!.href).toBe('blob:family-data');
  expect(clicked[0]!.isConnected).toBe(false);
  const blob = create.mock.calls[0]![0];
  expect(blob.type).toBe('application/json');
  expect(await blob.text()).toBe('{"ok":true}');
  expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(releaseDelayMs);
  expect(revoke).toHaveBeenCalledWith('blob:family-data');
});
