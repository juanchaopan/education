import assert from 'node:assert/strict';
import { test } from 'node:test';
import { waitForReadiness } from './staging-readiness.mjs';

function fixture(statuses) {
  let calls = 0;
  const waits = [];
  const options = {
    fetcher: async (_url, options) => {
      assert.equal(options.method ?? 'GET', 'GET');
      const status = statuses[Math.min(calls++, statuses.length - 1)];
      return new Response(JSON.stringify({ status: status === 200 ? 'ready' : 'unavailable' }), {
        status,
      });
    },
    wait: async (ms) => waits.push(ms),
  };
  return { options, waits, calls: () => calls };
}

test('startup 503 can recover before any account mutation begins', async () => {
  const { options, waits, calls } = fixture([503, 200]);
  const measurements = [];
  await waitForReadiness('https://candidate.vercel.app', measurements, options);
  assert.equal(calls(), 2);
  assert.deepEqual(waits, [1000]);
  assert.deepEqual(
    measurements.map((value) => value.status),
    [503, 200],
  );
});

test('persistent 503 fails after exactly five bounded GET probes', async () => {
  const { options, waits, calls } = fixture([503]);
  await assert.rejects(
    waitForReadiness('https://candidate.vercel.app', [], options),
    /remained unavailable/,
  );
  assert.equal(calls(), 5);
  assert.equal(waits.length, 4);
});

test('unexpected HTTP failures are not retried', async () => {
  for (const status of [401, 500]) {
    const { options, waits, calls } = fixture([status]);
    await assert.rejects(waitForReadiness('https://candidate.vercel.app', [], options), /HTTP/);
    assert.equal(calls(), 1);
    assert.equal(waits.length, 0);
  }
});

test('a 200 with an invalid readiness body never authorizes release', async () => {
  await assert.rejects(
    waitForReadiness('https://candidate.vercel.app', [], {
      fetcher: async () => new Response('{"status":"unavailable"}'),
      wait: async () => {},
    }),
    /Invalid/,
  );
});

test('transport failures are not silently converted into readiness success', async () => {
  await assert.rejects(
    waitForReadiness('https://candidate.vercel.app', [], {
      fetcher: async () => {
        throw new Error('network failed');
      },
      wait: async () => {},
    }),
    /network failed/,
  );
});
