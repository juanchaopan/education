import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Records a registered lesson for its review, from its title card to its last
// scene: `npm run lesson:review -- <problem id>[/<version>]`. The lesson is
// played in Chromium by its walk in review/walks.ts against the built site
// (`npm run build` first) and needs FFmpeg on the PATH. The MP4 with the
// page's sound and the timeline of media events are written to
// review-recordings/<problem id>-<version>/, which Git ignores; a person
// still watches and listens to it.

const root = fileURLToPath(new URL('../', import.meta.url));
const lesson = process.argv[2];
const built = ['apps/api/dist/index.js', 'apps/web/dist/index.html'];

function stop(message) {
  console.error(message);
  process.exit(1);
}

if (!lesson) stop('Name the lesson: npm run lesson:review -- <problem id>[/<version>]');
const unbuilt = built.filter((file) => !existsSync(join(root, file)));
if (unbuilt.length) stop(`Build the site first (npm run build); missing ${unbuilt.join(', ')}`);
if (spawnSync('ffmpeg', ['-version']).error) stop('The recording needs FFmpeg on the PATH');

const playwright = createRequire(import.meta.url).resolve('@playwright/test/cli');
const run = spawnSync(
  process.execPath,
  [playwright, 'test', '--config', join(root, 'playwright.review.config.ts')],
  { cwd: root, stdio: 'inherit', env: { ...process.env, LESSON_REVIEW: lesson } },
);
process.exit(run.status ?? 1);
