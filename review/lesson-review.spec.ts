import { test } from '@playwright/test';
import { lessons } from '../apps/web/src/features/learning/lessons/registry.js';
import { problemPath } from '../apps/web/src/shared/lib/problem-path.js';
import { prepareLessonCapture, recordLesson } from '../scripts/lesson-review-capture.mjs';
import { walks } from './walks.js';

// Records one registered lesson, named by LESSON_REVIEW as `<problem id>` or
// `<problem id>/<version>`, from its title card to its last scene: an MP4
// with the page's sound and the timeline of its media events, in
// review-recordings/<problem id>-<version>/. Run it through
// `npm run lesson:review -- <lesson>`.

const named = process.env.LESSON_REVIEW ?? '';
const [id, version] = named.split('/');
const entry = lessons
  .filter(({ problem }) => problem.id === id && (!version || String(problem.version) === version))
  .sort((one, other) => other.problem.version - one.problem.version)[0];

test(`records ${named} from its first scene to its last`, async ({ page }) => {
  if (!entry) throw new Error(`${named || 'No lesson'} is not in the lesson registry`);
  const { problem } = entry;
  const walk = walks[problem.id];
  if (!walk) throw new Error(`${problem.id} has no walk in review/walks.ts`);
  test.setTimeout(600_000);
  await prepareLessonCapture(page);
  const playLesson = await walk(page);
  await page.goto(problemPath(problem.id, problem.version));
  const folder = `review-recordings/${problem.id}-${problem.version}`;
  const { video, timeline } = await recordLesson(page, folder, playLesson);
  console.log(`Recorded ${problem.id}/${problem.version}:\n  ${video}\n  ${timeline}`);
});
