import { afterEach, describe, expect, it } from 'vitest';
import { ownRelease } from './own-release';

function nameRelease(content: string) {
  const meta = document.createElement('meta');
  meta.name = 'education-release';
  meta.content = content;
  document.head.append(meta);
}

describe('ownRelease', () => {
  afterEach(() => document.head.querySelector('meta[name="education-release"]')?.remove());

  it('reads the commit a deployment built the page from', () => {
    nameRelease('a'.repeat(40));
    expect(ownRelease()).toBe('a'.repeat(40));
  });

  it('finds no release in a local build or a malformed name', () => {
    expect(ownRelease()).toBeUndefined();
    nameRelease('main');
    expect(ownRelease()).toBeUndefined();
  });
});
