// Runs the visual and accessibility suite inside the pinned Playwright image,
// as CI does:
//   node scripts/visual.mjs [args]            compares with the committed baselines
//   node scripts/visual.mjs --update [args]   rewrites baselines for review
// Every other argument goes to Playwright: --grep <title> or test files limit
// the run, --workers=<n> sets how many browsers run at once.
// The repository is copied into the container without its node_modules, so
// the host's installed packages are never replaced by Linux builds. The
// container's packages live in Docker volumes named after the lock file,
// which later runs reuse, so they are installed again only when the lock file
// changes. Only the baselines (with --update) and the test results are
// copied back, owned by the owner of the repository.
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { onInterrupt, run } from './processes.mjs';

const volumePrefix = 'education-visual-deps-';

// A run that only sets the number of workers runs every test; any other
// argument may leave tests out.
export function parseOptions(argv) {
  const passed = argv.filter((arg) => arg !== '--update');
  return {
    update: argv.includes('--update'),
    passed,
    filtered: passed.some((arg) => !/^--workers=\d+%?$/.test(arg)),
  };
}

// The directories npm installs packages into: the root's, and those of the
// workspaces whose dependencies could not be hoisted to it.
export function installDirectories(lock) {
  const directories = new Set();
  for (const path of Object.keys(lock.packages)) {
    const inside = path.indexOf('node_modules/');
    if (inside >= 0) directories.add(`${path.slice(0, inside)}node_modules`);
  }
  return [...directories].sort();
}

// One volume for each of those directories, named after the lock file.
export function volumes(lockText) {
  const key = createHash('sha256').update(lockText).digest('hex').slice(0, 16);
  return installDirectories(JSON.parse(lockText)).map((directory) => ({
    name: `${volumePrefix}${key}-${directory.replaceAll('/', '-')}`,
    directory,
  }));
}

// The packages are installed once per set of volumes, under a lock on the
// root node_modules, so runs that start together install them once. The
// marker is written only after npm ci succeeded; a run that finds none
// clears what an interrupted install left behind.
function install(directories) {
  const marker = '/work/node_modules/.installed';
  const mounted = directories.map((directory) => `/work/${directory}`).join(' ');
  const steps = [
    `find ${mounted} -mindepth 1 -maxdepth 1 -exec rm -rf {} +`,
    'npm ci --no-audit --no-fund',
    `touch ${marker}`,
  ].join(' && ');
  return `flock /work/node_modules bash -c '[ -f ${marker} ] || { ${steps}; }'`;
}

// A filtered --update keeps the other baselines and copies back only those
// the run wrote. An unfiltered one starts without baselines and replaces the
// whole folders, so the baselines of stories or pages that no longer exist
// are gone.
function baselineCopy({ update, filtered }) {
  if (!update) return [];
  if (filtered)
    return [
      'find visual -path "*-snapshots/*" -type f -newer /tmp/started -exec cp --parents -t /repo {} +',
    ];
  return [
    'find /repo/visual -maxdepth 1 -name "*-snapshots" -exec rm -rf {} +',
    'cp -r visual/*-snapshots /repo/visual/',
  ];
}

export function containerScript(options, directories) {
  const ignored = [
    '.git',
    'node_modules',
    'dist',
    'storybook-static',
    'test-results',
    ...(options.update && !options.filtered ? ['./visual/*-snapshots'] : []),
  ];
  // Arguments reach the script as its positional parameters, so they are
  // never parsed as shell text.
  const playwright = [
    'npx playwright test -c playwright.visual.config.ts',
    ...(options.update ? ['--update-snapshots=all'] : []),
    '"$@"',
  ].join(' ');
  return [
    `tar -C /repo ${ignored.map((name) => `--exclude='${name}'`).join(' ')} -cf - . | tar -C /work -xf -`,
    install(directories),
    'npm run build',
    'npm run build-storybook',
    'touch /tmp/started',
    'status=0',
    `${playwright} || status=$?`,
    'owner=$(stat -c %u:%g /repo)',
    'rm -rf /repo/test-results/visual',
    'mkdir -p /repo/test-results',
    'if [ -d test-results ]; then cp -r test-results /repo/test-results/visual; fi',
    ...baselineCopy(options),
    // Bind mounts on Docker Desktop for Windows and macOS do not support chown
    // and already show the files as the host user's.
    'chown -R "$owner" /repo/test-results /repo/visual 2>/dev/null || true',
    'exit $status',
  ].join('\n');
}

const docker = (args, options = { stdio: 'ignore' }) => spawnSync('docker', args, options);

// Volumes of an earlier lock file are removed; Docker keeps those a running
// container still uses.
function removeOldVolumes(current) {
  const listed = docker(['volume', 'ls', '--quiet', '--filter', `name=${volumePrefix}`], {
    encoding: 'utf8',
  });
  const kept = new Set(current.map(({ name }) => name));
  const old = (listed.stdout ?? '').split(/\r?\n/).filter((name) => name && !kept.has(name));
  if (old.length) docker(['volume', 'rm', ...old]);
}

function dockerArgs(name, image, options, cache) {
  return [
    'run',
    '--rm',
    '--name',
    name,
    '--ipc=host',
    '-e',
    'CI',
    '-e',
    'STORYBOOK_DISABLE_TELEMETRY=1',
    '-v',
    `${resolve(fileURLToPath(new URL('../', import.meta.url)))}:/repo`,
    ...cache.flatMap(({ name: volume, directory }) => ['-v', `${volume}:/work/${directory}`]),
    '-w',
    '/work',
    image,
    'bash',
    '-euo',
    'pipefail',
    '-c',
    containerScript(
      options,
      cache.map(({ directory }) => directory),
    ),
    'visual',
    ...options.passed,
  ];
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const lockText = readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8');
  // The official image whose Chromium matches the installed @playwright/test.
  // It also fixes the fonts screenshots are drawn with, including the Chinese
  // font WenQuanYi Zen Hei.
  const version = JSON.parse(lockText).packages['node_modules/@playwright/test'].version;
  const image = `mcr.microsoft.com/playwright:v${version}-noble`;
  const cache = volumes(lockText);
  const name = `education-visual-${randomBytes(4).toString('hex')}`;
  let interrupted = 0;
  onInterrupt((_signal, code) => {
    interrupted = code;
    docker(['rm', '--force', name]);
  });
  try {
    const status = await run('docker', dockerArgs(name, image, options, cache));
    return interrupted || status;
  } finally {
    docker(['rm', '--force', name]);
    removeOldVolumes(cache);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main();
