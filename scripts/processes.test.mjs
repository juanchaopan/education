import assert from 'node:assert/strict';
import { test } from 'node:test';
import { end, run, start } from './processes.mjs';

const quiet = { stdio: 'ignore' };
const forever = ['-e', 'setInterval(() => {}, 1000)'];

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test('a program resolves with its exit code', async () => {
  assert.equal(await run(process.execPath, ['-e', 'process.exit(0)'], quiet), 0);
  assert.equal(await run(process.execPath, ['-e', 'process.exit(3)'], quiet), 3);
});

test('a program that cannot start counts as failed', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await run('education-no-such-program', [], quiet), 1);
  } finally {
    console.error = original;
  }
});

test('an ended program counts as failed', async () => {
  const { child, exit } = start(process.execPath, forever, quiet);
  end(child, 'SIGTERM');
  assert.notEqual(await exit, 0);
  end(child, 'SIGTERM');
});

test(
  'on Windows, ending a program ends the programs it started too',
  { skip: process.platform !== 'win32' },
  async () => {
    const parent = `
      const { spawn } = require('node:child_process');
      const child = spawn(process.execPath, ${JSON.stringify(forever)}, { stdio: 'ignore' });
      console.log(child.pid);
      setInterval(() => {}, 1000);
    `;
    const { child, exit } = start(process.execPath, ['-e', parent], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const grandchild = await new Promise((resolve) => {
      child.stdout.once('data', (data) => resolve(Number(String(data).trim())));
    });
    end(child, 'SIGTERM');
    await exit;
    assert.equal(alive(grandchild), false);
  },
);
