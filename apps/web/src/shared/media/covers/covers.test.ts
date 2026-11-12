import { describe, expect, it } from 'vitest';
import { problemRegistry } from '@education/problems/server';
import { coverImage, covers } from './covers';

// The picture files in the cover folder, by file name.
const files = Object.keys(import.meta.glob('./*.webp', { query: '?url' }))
  .map((path) => path.slice(path.lastIndexOf('/') + 1))
  .sort();
const entries = Object.values(covers);
const filled = (text: string) => text.trim().length > 0;

describe('the cover library', () => {
  it('lists every picture in its folder, and nothing else', () => {
    expect(entries.map(({ file }) => file).sort()).toEqual(files);
  });

  it('names each cover by its file and tags it in full', () => {
    for (const entry of entries) {
      expect(entry.file).toBe(`${entry.id}.webp`);
      expect(entry.image).toContain(entry.file);
      expect([entry.motif, entry.prompt, ...entry.subjects].every(filled)).toBe(true);
      expect(new Set(entry.ages).size).toBe(entry.ages.length);
    }
  });

  it('holds the cover of every book in the problem list', () => {
    for (const { id, cover } of problemRegistry.books)
      if (cover !== undefined) expect(Object.keys(covers), `the cover of ${id}`).toContain(cover);
  });

  it('gives no picture to a book without a cover or with one the library lacks', () => {
    expect(coverImage(null)).toBeUndefined();
    expect(coverImage('not-in-the-library')).toBeUndefined();
    expect(coverImage('constructor')).toBeUndefined();
  });
});
