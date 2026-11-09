// @vitest-environment node
// The problem plugins hold the answers and run only on the server, so they
// load only in Node; this test reads them to check each lesson against them.
import { problemRegistry } from '@education/problems/server';
import { expect, it } from 'vitest';
import { lessonProblems } from '../../../test/lesson-check';
import { lessons } from './registry';

it.each(lessons.map((entry) => [`${entry.problem.id}/${entry.problem.version}`, entry] as const))(
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

it('registers each problem version once', () => {
  const versions = lessons.map(({ problem }) => `${problem.id}/${problem.version}`);
  expect(new Set(versions).size).toBe(versions.length);
});
