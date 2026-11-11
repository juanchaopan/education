// @vitest-environment node
// The problem plugins hold the answers and run only on the server, so they
// load only in Node; this test reads them to check each lesson against them.
import { problemRegistry } from '@education/problems/server';
import { expect, it } from 'vitest';
import voiceConfig from '../../../../../../scripts/lesson-voice.json';
import { problemPath } from '../../../shared/lib/problem-path';
import {
  lessonProblems,
  narrationProblems,
  versionName,
  type NarrationRecord,
} from '../../../test/lesson-check';
import type { FilmLine } from '../interaction/lesson-film';
import { lessons } from './registry';

const registered = lessons.map(({ problem }) => problemPath(problem.id, problem.version));

// A lesson's folder is named by its problem id. It holds the script the
// narration tool reads the lines from, and the record of what each of its
// recordings says and in which voice.
const scripts = import.meta.glob<{ lines: Readonly<Record<string, FilmLine>> }>('./*/script.ts');
const records = import.meta.glob<NarrationRecord>('./*/assets/narration.json', {
  eager: true,
  import: 'default',
});

const each = lessons.map((entry) => [versionName(entry.problem), entry] as const);

it.each(each)(
  'registers %s so that it agrees with its plugin and plays every scene',
  async (_name, { problem, definition }) => {
    const plugin = problemRegistry.find(problem.id, problem.version);
    const outline = plugin && {
      steps: Object.keys(plugin.feedback ?? {}),
      hints: Object.keys(plugin.answering?.hints ?? {}),
    };
    expect(lessonProblems(problem, await definition(), outline)).toEqual([]);
  },
);

it.each(each)(
  'records every line of %s from the words it shows, in the voice the tool is set to',
  async (_name, { problem, definition }) => {
    const outline = await definition();
    const script = await scripts[`./${problem.id}/script.ts`]?.();
    expect(script?.lines).toBe(outline.script.lines);
    const record = records[`./${problem.id}/assets/narration.json`];
    expect(narrationProblems(outline, voiceConfig, record)).toEqual([]);
  },
);

it('registers each problem version once, so no page takes the place of another', () => {
  expect(new Set(registered).size).toBe(registered.length);
});

it('registers a lesson for every problem version the catalog lists', () => {
  const listed = problemRegistry.current.map(({ id, version }) => problemPath(id, version));
  expect(listed.filter((path) => !registered.includes(path))).toEqual([]);
});
