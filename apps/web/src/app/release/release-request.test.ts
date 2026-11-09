import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestRelease } from './release-request';

const release = 'b'.repeat(40);

afterEach(() => vi.unstubAllGlobals());

describe('requestRelease', () => {
  it('asks for the version file past every cache and reads the release it names', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ revision: release }));
    vi.stubGlobal('fetch', fetch);
    await expect(requestRelease()).resolves.toBe(release);
    expect(fetch).toHaveBeenCalledWith(
      '/version.json',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('fails on a reply that did not arrive, is not a version file or names no release', async () => {
    for (const reply of [
      () => Promise.reject(new TypeError('offline')),
      () => Promise.resolve(new Response('busy', { status: 503 })),
      () => Promise.resolve(new Response('<!doctype html>')),
      () => Promise.resolve(Response.json(null)),
      () => Promise.resolve(Response.json({ revision: null })),
      () => Promise.resolve(Response.json({ revision: 'main' })),
    ]) {
      vi.stubGlobal('fetch', vi.fn(reply));
      await expect(requestRelease()).rejects.toThrow();
    }
  });
});
