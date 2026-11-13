import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { containerScript, installDirectories, parseOptions, volumes } from './visual.mjs';

const lock = (packages) => JSON.stringify({ packages: { '': {}, ...packages } });

test('only --update stays with the script; the rest goes to Playwright', () => {
  assert.deepEqual(parseOptions(['--update', '--grep', '孩子登录']), {
    update: true,
    passed: ['--grep', '孩子登录'],
    filtered: true,
  });
  assert.deepEqual(parseOptions(['visual/pages.spec.ts']).passed, ['visual/pages.spec.ts']);
});

test('a run that only sets the workers runs every test', () => {
  assert.equal(parseOptions(['--update']).filtered, false);
  assert.equal(parseOptions(['--update', '--workers=2']).filtered, false);
  assert.equal(parseOptions(['--workers=50%']).filtered, false);
  assert.equal(parseOptions(['--update', 'visual/pages.spec.ts']).filtered, true);
  assert.equal(parseOptions(['--update', '--workers=2', '-g', '书架']).filtered, true);
});

test('packages are cached for every directory npm installs into', () => {
  const directories = installDirectories(
    JSON.parse(
      lock({
        'apps/api': {},
        'node_modules/vite': {},
        'node_modules/a/node_modules/b': {},
        'node_modules/@education/api': { link: true },
        'apps/api/node_modules/nodemailer': {},
      }),
    ),
  );
  assert.deepEqual(directories, ['apps/api/node_modules', 'node_modules']);
});

test('the cache volumes change with the lock file', () => {
  const before = volumes(lock({ 'node_modules/vite': { version: '8.0.0' } }));
  const after = volumes(lock({ 'node_modules/vite': { version: '8.0.1' } }));
  assert.equal(before.length, 1);
  assert.match(before[0].name, /^education-visual-deps-[0-9a-f]{16}-node_modules$/);
  assert.notEqual(before[0].name, after[0].name);
  assert.deepEqual(volumes(lock({ 'node_modules/vite': { version: '8.0.0' } })), before);
});

test('the volumes of this repository are valid Docker volume names', () => {
  const text = readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8');
  for (const { name } of volumes(text)) assert.match(name, /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/);
});

const script = (argv) => containerScript(parseOptions(argv), ['node_modules']);
const leavesOutBaselines = /--exclude='\.\/visual\/\*-snapshots'/;
const replacesFolders = /-name "\*-snapshots" -exec rm -rf \{\} \+\ncp -r visual\/\*-snapshots/;
const copiesWritten = /-newer \/tmp\/started -exec cp --parents -t \/repo \{\} \+/;

test('a comparison keeps the baselines and copies none back', () => {
  const comparison = script(['--grep', '书架']);
  assert.doesNotMatch(comparison, leavesOutBaselines);
  assert.doesNotMatch(comparison, /--update-snapshots/);
  assert.doesNotMatch(comparison, replacesFolders);
  assert.doesNotMatch(comparison, copiesWritten);
});

test('an unfiltered update replaces the whole baseline folders', () => {
  const update = script(['--update', '--workers=2']);
  assert.match(update, leavesOutBaselines);
  assert.match(update, /--update-snapshots=all/);
  assert.match(update, replacesFolders);
  assert.doesNotMatch(update, copiesWritten);
});

test('a filtered update copies back only the baselines the run wrote', () => {
  const update = script(['--update', 'visual/pages.spec.ts']);
  assert.doesNotMatch(update, leavesOutBaselines);
  assert.doesNotMatch(update, replacesFolders);
  assert.match(update, /touch \/tmp\/started\n(.*\n)*npx playwright test/);
  assert.match(update, copiesWritten);
});

test('the packages are installed only when the volumes have none', () => {
  const comparison = containerScript(parseOptions([]), ['apps/api/node_modules', 'node_modules']);
  assert.match(comparison, /flock \/work\/node_modules/);
  assert.match(comparison, /\[ -f \/work\/node_modules\/\.installed \] \|\|/);
  assert.match(comparison, /find \/work\/apps\/api\/node_modules \/work\/node_modules -mindepth 1/);
});
