// @vitest-environment node
// The problem plugins hold the answers and run only on the server, so they
// load only in Node; this test reads them to check each lesson against them.
import { problemRegistry } from '@education/problems/server';
import { expect, it } from 'vitest';
import { problemPath } from '../../../shared/lib/problem-path';
import { lessonProblems, versionName } from '../../../test/lesson-check';
import { lessons } from './registry';

const registered = lessons.map(({ problem }) => problemPath(problem.id, problem.version));

it.each(lessons.map((entry) => [versionName(entry.problem), entry] as const))(
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

it('registers each problem version once, so no page takes the place of another', () => {
  expect(new Set(registered).size).toBe(registered.length);
});

it('registers a lesson for every problem version the catalog lists', () => {
  const listed = problemRegistry.current.map(({ id, version }) => problemPath(id, version));
  expect(listed.filter((path) => !registered.includes(path))).toEqual([]);
});
