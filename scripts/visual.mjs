// Runs the visual and accessibility suite inside the pinned Playwright image,
// as CI does:
//   node scripts/visual.mjs                  compares with the committed baselines
//   node scripts/visual.mjs --update         rewrites every baseline for review
//   node scripts/visual.mjs -- --workers=2   passes the rest on to Playwright
// The repository is copied into the container without its node_modules, so
// the host's installed packages are never replaced by Linux builds. Only the
// baselines (with --update) and the test results are copied back, owned by
// the owner of the repository.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const options = process.argv.slice(2);
const update = options.includes('--update');
const passed = options.includes('--') ? options.slice(options.indexOf('--') + 1) : [];

// --update replaces the whole baseline folders, so it has to run every test:
// a filtered run would drop the baselines of the tests it left out.
if (update && passed.some((option) => !/^--workers=\d+$/.test(option))) {
  console.error('--update regenerates every baseline; only --workers=<n> can be passed with it.');
  process.exit(2);
}

// The baselines stay out of the container when they are being regenerated,
// so those of stories or pages that no longer exist are not copied back.
const ignored = [
  '.git',
  'node_modules',
  'dist',
  'storybook-static',
  'test-results',
  ...(update ? ['./visual/*-snapshots'] : []),
];

// The official image whose Chromium matches the installed @playwright/test.
// It also fixes the fonts screenshots are drawn with, including the Chinese
// font WenQuanYi Zen Hei.
const lock = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8'));
const image = `mcr.microsoft.com/playwright:v${lock.packages['node_modules/@playwright/test'].version}-noble`;

// Arguments reach the container script as its positional parameters, so they
// are never parsed as shell text.
const playwright = [
  'npx playwright test -c playwright.visual.config.ts',
  update ? '--update-snapshots=all' : '',
  '"$@"',
].join(' ');

const script = [
  `tar -C /repo ${ignored.map((name) => `--exclude='${name}'`).join(' ')} -cf - . | tar -C /work -xf -`,
  'npm ci --no-audit --no-fund',
  'npm run build',
  'npm run build-storybook',
  'status=0',
  `${playwright} || status=$?`,
  'owner=$(stat -c %u:%g /repo)',
  'rm -rf /repo/test-results/visual',
  'mkdir -p /repo/test-results',
  'if [ -d test-results ]; then cp -r test-results /repo/test-results/visual; fi',
  ...(update
    ? [
        'find /repo/visual -maxdepth 1 -name "*-snapshots" -exec rm -rf {} +',
        'cp -r visual/*-snapshots /repo/visual/',
      ]
    : []),
  // Bind mounts on Docker Desktop for Windows and macOS do not support chown
  // and already show the files as the host user's.
  'chown -R "$owner" /repo/test-results /repo/visual 2>/dev/null || true',
  'exit $status',
].join('\n');

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--ipc=host',
    '-e',
    'CI',
    '-e',
    'STORYBOOK_DISABLE_TELEMETRY=1',
    '-v',
    `${resolve(fileURLToPath(root))}:/repo`,
    '-w',
    '/work',
    image,
    'bash',
    '-euo',
    'pipefail',
    '-c',
    script,
    'visual',
    ...passed,
  ],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
