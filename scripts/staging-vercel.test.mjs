import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { uploadFiles, vercelApi, vercelUpload } from './staging-vercel.mjs';

async function withFetch(fake, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test('deployment errors cannot echo environment credential values into logs', async () => {
  await withFetch(
    async () =>
      new Response(JSON.stringify({ error: { message: 'private-credential-fixture' } }), {
        status: 400,
      }),
    () =>
      assert.rejects(
        vercelApi('test-token', 'team_fixture')('POST', '/v13/deployments', {
          env: { DATABASE_URL: 'private-credential-fixture' },
        }),
        (error) => {
          assert.match(error.message, /HTTP 400/);
          assert.equal(error.message.includes('private-credential-fixture'), false);
          return true;
        },
      ),
  );
});

test('deployment errors name the provider error code, but not a code that is free text', async () => {
  const failing = (code) => async () =>
    new Response(JSON.stringify({ error: { code, message: 'private-credential-fixture' } }), {
      status: 400,
    });
  await withFetch(failing('too_many_files'), () =>
    assert.rejects(
      vercelApi('test-token', 'team_fixture')('POST', '/v13/deployments', {}),
      /^Error: Vercel POST failed \(HTTP 400\) too_many_files$/,
    ),
  );
  await withFetch(failing('DATABASE_URL=private-credential-fixture'), () =>
    assert.rejects(
      vercelApi('test-token', 'team_fixture')('POST', '/v13/deployments', {}),
      /^Error: Vercel POST failed \(HTTP 400\)$/,
    ),
  );
});

test('public alias permission errors retain actionable provider details', async () => {
  await withFetch(
    async () =>
      new Response(JSON.stringify({ error: { message: 'Domain belongs to another project' } }), {
        status: 403,
      }),
    () =>
      assert.rejects(
        vercelApi('test-token', 'team_fixture')('POST', '/v2/deployments/dpl_fixture/aliases', {
          alias: 'staging.example.test',
        }),
        /HTTP 403.*Domain belongs to another project/,
      ),
  );
});

test('a file is uploaded as its bytes under their SHA-1 digest', async () => {
  const data = Buffer.from('release file fixture');
  const sha = createHash('sha1').update(data).digest('hex');
  const seen = [];
  await withFetch(
    async (url, init) => {
      seen.push({ url, init });
      return new Response('{}', { status: 200 });
    },
    async () => assert.equal(await vercelUpload('test-token', 'team_fixture')(data), sha),
  );
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://api.vercel.com/v2/files?teamId=team_fixture');
  assert.equal(seen[0].init.method, 'POST');
  assert.equal(seen[0].init.headers['x-vercel-digest'], sha);
  assert.equal(seen[0].init.headers['Content-Type'], 'application/octet-stream');
  assert.equal(seen[0].init.body, data);
});

test('a failed upload stops the release with its status', async () => {
  await withFetch(
    async () => new Response('{}', { status: 413 }),
    () =>
      assert.rejects(
        vercelUpload('test-token', 'team_fixture')(Buffer.from('x')),
        /Vercel POST failed \(HTTP 413\)/,
      ),
  );
});

test('every file is uploaded once, a few at a time, and named in its own place', async () => {
  const files = Array.from({ length: 20 }, (_, place) => ({
    file: `apps/web/file-${place}.txt`,
    data: Buffer.from('x'.repeat(place + 1)),
  }));
  let running = 0;
  let most = 0;
  const uploaded = [];
  const upload = async (data) => {
    running++;
    most = Math.max(most, running);
    await new Promise((resolve) => setTimeout(resolve, 1));
    running--;
    uploaded.push(data.length);
    return `sha-${data.length}`;
  };
  const named = await uploadFiles(upload, files, 4);
  assert.equal(most, 4);
  assert.deepEqual(
    uploaded.toSorted((a, b) => a - b),
    files.map((_, place) => place + 1),
  );
  assert.deepEqual(
    named,
    files.map(({ file }, place) => ({ file, sha: `sha-${place + 1}`, size: place + 1 })),
  );
});
