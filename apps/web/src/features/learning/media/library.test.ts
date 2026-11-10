import { describe, expect, it } from 'vitest';
import { inside, world } from '../components/lesson-stage/stage-look';
import { backdrops } from './backdrops/backdrops';
import * as backdropStories from './backdrops/backdrops.stories';
import { catalog, type Age } from './library';
import { teachers } from './teachers/teachers';
import * as teacherStories from './teachers/teachers.stories';

// The picture files in a library folder, by file name.
const filesIn = (found: Record<string, unknown>) =>
  Object.keys(found)
    .map((path) => path.slice(path.lastIndexOf('/') + 1))
    .sort();

// The ids a stories file shows, each story's own args over its default ones.
type Stories = Readonly<Record<string, { args?: Record<string, unknown> }>>;
function shown({ default: meta, ...stories }: Stories, arg: string) {
  return Object.values(stories).map((story) => {
    const entry = (story.args?.[arg] ?? meta?.args?.[arg]) as { id: string } | undefined;
    return entry?.id;
  });
}

const filled = (text: string) => text.trim().length > 0;

type Entry = Readonly<{ id: string; file: string; image: string; ages: readonly Age[] }>;

describe.each([
  {
    library: 'backdrop',
    entries: Object.values(backdrops) as readonly Entry[],
    files: filesIn(import.meta.glob('./backdrops/*.webp', { query: '?url' })),
    stories: shown(backdropStories, 'backdrop'),
  },
  {
    library: 'teacher',
    entries: Object.values(teachers) as readonly Entry[],
    files: filesIn(import.meta.glob('./teachers/*.webp', { query: '?url' })),
    stories: shown(teacherStories, 'teacher'),
  },
])('the $library library', ({ entries, files, stories }) => {
  it.each(entries.map((entry) => [entry.id, entry] as const))(
    'names %s by its file, once for each school year',
    (id, entry) => {
      expect(entry.file).toBe(`${id}.webp`);
      expect(entry.image).toContain(entry.file);
      expect(new Set(entry.ages).size).toBe(entry.ages.length);
    },
  );

  it('lists every picture in its folder, and nothing else', () => {
    expect(entries.map(({ file }) => file).sort()).toEqual(files);
  });

  it('shows every picture in Storybook, so each has a visual baseline', () => {
    expect([...stories].sort()).toEqual(entries.map(({ id }) => id).sort());
  });
});

describe('the backdrop library', () => {
  it.each(Object.entries(backdrops))('tags %s in full, its clearing in the world', (_, entry) => {
    expect([entry.setting, entry.light, entry.focus, entry.prompt].every(filled)).toBe(true);
    expect(entry.fits.every(filled)).toBe(true);
    expect(entry.clearZone.width).toBeGreaterThan(0);
    expect(entry.clearZone.height).toBeGreaterThan(0);
    expect(inside(entry.clearZone, world)).toBe(true);
  });
});

describe('the teacher library', () => {
  it.each(Object.entries(teachers))('describes %s in full', (_, entry) => {
    expect([entry.name, entry.personality, entry.prompt].every(filled)).toBe(true);
  });
});

describe('a library catalog', () => {
  const files = { './found.webp': '/assets/found-1a2b.webp' };

  it('gives each entry its id and the address of its picture', () => {
    expect(catalog({ found: { file: 'found.webp' } }, files)).toEqual({
      found: { id: 'found', file: 'found.webp', image: '/assets/found-1a2b.webp' },
    });
  });

  it('takes only pictures beside the list that names them', () => {
    expect(() => catalog({ lost: { file: 'lost.webp' } }, files)).toThrow(
      'lost.webp is not in the library',
    );
  });
});
