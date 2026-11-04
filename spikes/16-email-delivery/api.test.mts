import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, type IncomingMessage } from 'node:http';
import { test } from 'node:test';
import handler, { allowedPost, readAction, validateAction } from './api/probe.ts';

test('accepts Vercel-preparsed JSON and rejects oversized or malformed bodies before SMTP', async () => {
  const parsed = { body: { action: 'connect' } } as unknown as IncomingMessage;
  assert.deepEqual(await readAction(parsed), { action: 'connect' });
  const encoded = { body: '{"action":"connect"}' } as unknown as IncomingMessage;
  assert.deepEqual(await readAction(encoded), { action: 'connect' });
  const oversized = { body: 'a'.repeat(1025) } as unknown as IncomingMessage;
  await assert.rejects(() => readAction(oversized));
  const malformed = { body: '{broken' } as unknown as IncomingMessage;
  await assert.rejects(() => readAction(malformed));
});

test('private page accepts only the 126 recipient slot and explicit per-message consent', () => {
  assert.deepEqual(validateAction({ action: 'connect' }), { action: 'connect' });
  assert.deepEqual(
    validateAction({ action: 'send', recipient: '126', purpose: 'verify', consent: true }),
    { action: 'send', recipient: '126', purpose: 'verify', consent: true },
  );
  for (const recipient of ['qq', '163']) {
    assert.throws(() =>
      validateAction({ action: 'send', recipient, purpose: 'verify', consent: true }),
    );
  }
  assert.throws(() =>
    validateAction({
      action: 'send',
      recipient: 'arbitrary@example.invalid',
      purpose: 'verify',
      consent: true,
    }),
  );
  assert.throws(() => validateAction({ action: 'send', recipient: '126', purpose: 'verify' }));
  assert.throws(() =>
    validateAction({ action: 'send', recipient: '126', purpose: 'other', consent: true }),
  );
});

test('rejects cross-origin, missing-origin, simple-form and missing-header requests', () => {
  const headers = {
    origin: 'https://example.vercel.app',
    'x-mail-probe': '1',
    'content-type': 'application/json',
  };
  assert.equal(allowedPost({ headers }, 'example.vercel.app'), true);
  assert.equal(allowedPost({ headers }, ''), false);
  for (const changes of [
    { origin: 'https://evil.invalid' },
    { origin: undefined },
    { 'x-mail-probe': undefined },
    { 'content-type': 'application/x-www-form-urlencoded' },
  ]) {
    assert.equal(allowedPost({ headers: { ...headers, ...changes } }, 'example.vercel.app'), false);
  }
});

test('actual HTTP handler blocks wrong methods/origins and disabled deployment without SMTP', async () => {
  process.env.VERCEL_ENV = 'preview';
  process.env.VERCEL_URL = 'example.vercel.app';
  process.env.MAIL_PROBE_ENABLED = 'no';
  const server = createServer((request, response) => {
    void handler(request, response);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const url = `http://127.0.0.1:${address.port}/api/probe`;
    const get = await fetch(url);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('cache-control'), 'no-store');
    const foreign = await fetch(url, { method: 'POST', body: '{}' });
    assert.equal(foreign.status, 403);
    const disabled = await fetch(url, {
      method: 'POST',
      headers: {
        Origin: 'https://example.vercel.app',
        'X-Mail-Probe': '1',
        'Content-Type': 'application/json',
      },
      body: '{"action":"connect"}',
    });
    assert.equal(disabled.status, 503);
    assert.equal((await disabled.json()).sent, false);
    process.env.VERCEL_ENV = 'production';
    const production = await fetch(url, {
      method: 'POST',
      headers: {
        Origin: 'https://example.vercel.app',
        'X-Mail-Probe': '1',
        'Content-Type': 'application/json',
      },
      body: '{"action":"connect"}',
    });
    assert.equal(production.status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
