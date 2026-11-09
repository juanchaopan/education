import { describe, expect, it } from 'vitest';
import { backdrops } from './backdrops/backdrops';
import { inside, pictureFiles, world } from './library';
import { teachers } from './teachers/teachers';

// The picture files in each library folder, by file name.
const filesIn = (found: Record<string, unknown>) =>
  Object.keys(found)
    .map((path) => path.slice(path.lastIndexOf('/') + 1))
    .sort();
const backdropFiles = filesIn(import.meta.glob('./backdrops/*.webp', { query: '?url' }));
const teacherFiles = filesIn(import.meta.glob('./teachers/*.webp', { query: '?url' }));

const filled = (text: string) => text.trim().length > 0;

describe('the backdrop library', () => {
  it.each(Object.entries(backdrops))('tags %s in full', (key, backdrop) => {
    expect(backdrop.id).toBe(key);
    expect(backdrop.file).toBe(`${key}.webp`);
    expect(backdrop.image).toContain(backdrop.file);
    expect([backdrop.setting, backdrop.light, backdrop.focus, backdrop.prompt].every(filled)).toBe(
      true,
    );
    expect(backdrop.ages.length).toBeGreaterThan(0);
    expect(new Set(backdrop.ages).size).toBe(backdrop.ages.length);
    expect(backdrop.fits.every(filled)).toBe(true);
  });

  it.each(Object.entries(backdrops))('keeps the clearing of %s inside the world', (_, backdrop) => {
    const { clearZone } = backdrop;
    expect(clearZone.width).toBeGreaterThan(0);
    expect(clearZone.height).toBeGreaterThan(0);
    expect(inside(clearZone, world)).toBe(true);
  });

  it('lists every picture in its folder, and nothing else', () => {
    const listed = Object.values(backdrops).map(({ file }) => file);
    expect(listed.sort()).toEqual(backdropFiles);
  });
});

describe('the teacher library', () => {
  it.each(Object.entries(teachers))('describes %s in full', (key, teacher) => {
    expect(teacher.id).toBe(key);
    expect(teacher.file).toBe(`${key}.webp`);
    expect(teacher.image).toContain(teacher.file);
    expect([teacher.name, teacher.personality, teacher.prompt].every(filled)).toBe(true);
    expect(teacher.ages.length).toBeGreaterThan(0);
    expect(new Set(teacher.ages).size).toBe(teacher.ages.length);
  });

  it('lists every picture in its folder, and nothing else', () => {
    const listed = Object.values(teachers).map(({ file }) => file);
    expect(listed.sort()).toEqual(teacherFiles);
  });
});

describe('library pictures', () => {
  const picture = pictureFiles({ './found.webp': '/assets/found-1a2b.webp' });

  it('are found by file name', () => {
    expect(picture('found.webp')).toBe('/assets/found-1a2b.webp');
  });

  it('must be beside the list that names them', () => {
    expect(() => picture('lost.webp')).toThrow('lost.webp is not in the library');
  });
});

describe('boxes in the world', () => {
  const frame = { x: 10, y: 10, width: 100, height: 50 };

  it('lie inside a frame when every edge is within it, touching included', () => {
    expect(inside(frame, frame)).toBe(true);
    expect(inside({ x: 20, y: 20, width: 10, height: 10 }, frame)).toBe(true);
  });

  it('do not when any edge passes beyond it', () => {
    expect(inside({ ...frame, x: 9 }, frame)).toBe(false);
    expect(inside({ ...frame, y: 11 }, frame)).toBe(false);
    expect(inside({ ...frame, width: 101 }, frame)).toBe(false);
    expect(inside({ ...frame, height: 51 }, frame)).toBe(false);
  });
});
