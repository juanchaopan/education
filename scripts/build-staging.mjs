import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const revision = process.env.RELEASE_SHA;
if (!/^[a-f0-9]{40}$/.test(revision ?? ''))
  throw new Error('RELEASE_SHA must be a full commit SHA');
execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
await writeFile('apps/api/dist/release.json', JSON.stringify({ revision }) + '\n');
