import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'education-toolchain-'));
  const write = (path, content) => {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  };
  try {
    return run(directory, write);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function lint(file) {
  return spawnSync(
    join(root, 'node_modules/.bin/oxlint'),
    ['--no-ignore', '--deny-warnings', '-c', join(root, '.oxlintrc.json'), file],
    { encoding: 'utf8' },
  );
}

function architecture(directory, component) {
  copyFileSync(
    join(root, `apps/${component}/.dependency-cruiser.cjs`),
    join(directory, '.dependency-cruiser.cjs'),
  );
  symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
  return spawnSync(process.execPath, [join(root, 'scripts/arch-check.mjs')], {
    cwd: directory,
    encoding: 'utf8',
  });
}

for (const [name, code, diagnostic] of [
  ['explicit any', 'export const value: any = 1;', 'no-explicit-any'],
  [
    'parameter limit',
    'export function sum(a: number, b: number, c: number, d: number, e: number, f: number) { return a+b+c+d+e+f; }',
    'max-params',
  ],
  [
    'function length',
    `export function long() {\n${'console.log(1);\n'.repeat(61)}}`,
    'max-lines-per-function',
  ],
  [
    'complexity',
    `export function complex(value: number) {\n${'if (value) console.log(value);\n'.repeat(11)}}`,
    'complexity',
  ],
]) {
  test(`lint still rejects ${name}`, () =>
    fixture((_directory, write) => {
      const result = lint(write('invalid.ts', code));
      assert.equal(result.status, 1, result.error?.message);
      assert.match(result.stdout + result.stderr, new RegExp(diagnostic));
    }));
}

test('architecture rejects a type-only import from domain into routes', () =>
  fixture((directory, write) => {
    write('src/catalog/routes/example.ts', 'export interface Example { value: number }');
    write(
      'src/catalog/domain/example.ts',
      "import type { Example } from '../routes/example.js'; export type Test = Example;",
    );
    const result = architecture(directory, 'api');
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /routes-not-imported-by-inner-layers/);
  }));

test('presentation may import a type from data-access', () =>
  fixture((directory, write) => {
    write(
      'src/features/library/data-access/example.ts',
      'export interface Example { value: number }',
    );
    write(
      'src/features/library/components/example.ts',
      "import type { Example } from '../data-access/example.js'; export type Test = Example;",
    );
    const result = architecture(directory, 'web');
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /2 个模块/);
  }));

test('presentation cannot import a runtime value from data-access', () =>
  fixture((directory, write) => {
    write('src/features/library/data-access/example.ts', 'export const value = 1;');
    write(
      'src/features/library/components/example.ts',
      "export { value } from '../data-access/example.js';",
    );
    const result = architecture(directory, 'web');
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /presentational-no-data-access/);
  }));

test("a lesson cannot import another lesson's files", () =>
  fixture((directory, write) => {
    write('src/features/learning/lessons/weigh/script.ts', 'export const lines = {};');
    write(
      'src/features/learning/components/count/scene.ts',
      "export { lines } from '../../lessons/weigh/script.js';",
    );
    const result = architecture(directory, 'web');
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /lessons-isolated/);
  }));

test("code outside a lesson cannot import the lesson's files statically", () =>
  fixture((directory, write) => {
    write('src/features/learning/lessons/weigh/definition.ts', 'export const lesson = {};');
    write(
      'src/app/lesson-pages.ts',
      "export { lesson } from '../features/learning/lessons/weigh/definition.js';",
    );
    const result = architecture(directory, 'web');
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /lessons-loaded-on-demand/);
  }));

test('code outside a lesson may load the lesson when it is opened', () =>
  fixture((directory, write) => {
    write('src/features/learning/lessons/weigh/definition.ts', 'export const lesson = {};');
    write(
      'src/app/lesson-pages.ts',
      "export const load = () => import('../features/learning/lessons/weigh/definition.js');",
    );
    const result = architecture(directory, 'web');
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /2 个模块/);
  }));

test('web code cannot import the problem plugins', () =>
  fixture((directory, write) => {
    write(
      'src/features/learning/pages/answers.ts',
      "export { problemRegistry } from '@education/problems/server';",
    );
    const result = architecture(directory, 'web');
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /no-problem-plugins-in-browser/);
  }));

test('JavaScript still rejects undefined variables', () =>
  fixture((_directory, write) => {
    const result = lint(write('invalid.mjs', 'export const value = missingValue;'));
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stdout + result.stderr, /no-undef/);
  }));

test('parser rejects legacy octal syntax in modules', () =>
  fixture((_directory, write) => {
    const result = lint(write('invalid.mjs', 'export const value = 012;'));
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stdout + result.stderr, /octal|Octal/);
  }));
