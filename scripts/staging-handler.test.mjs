import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

test('compiled Vercel handler preserves request validation, static routes and release identity', async () => {
  process.env.REGISTRATION_ENABLED = 'false';
  process.env.RELEASE_SHA = '0'.repeat(40);
  const { default: handler, config } = await import('../api/index.mjs');
  assert.equal(config.api.bodyParser, false);
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const live = await fetch(`${origin}/health/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });
    assert.equal((await fetch(`${origin}/health/ready`)).status, 503);
    const version = await fetch(`${origin}/version.json`);
    assert.equal(version.headers.get('cache-control'), 'no-store');
    const stored = await readFile(new URL('../apps/api/dist/release.json', import.meta.url), 'utf8')
      .then(JSON.parse)
      .catch((error) => {
        if (error.code === 'ENOENT') return { revision: null };
        throw error;
      });
    assert.deepEqual(await version.json(), stored);
    const page = await fetch(`${origin}/family`);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('cache-control'), 'no-cache');
    assert.match(await page.text(), /<html/);
    assert.equal((await fetch(`${origin}/api/unknown`)).status, 404);
    const invalid = await fetch(`${origin}/api/v1/parents/register`, {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Content-Type': 'application/json',
        'X-Education-Request': 'registration',
      },
      body: '{',
    });
    assert.equal(invalid.status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
