import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timedGet, waitForReadiness } from './staging-readiness.mjs';

const candidate = 'https://candidate.vercel.app';
const timeout = () => new DOMException('The operation was aborted due to timeout', 'TimeoutError');

// Each answer is an HTTP status, or `timeout` for a request that the abort
// signal ends the way fetch does: with a DOMException named TimeoutError.
function fixture(answers) {
  let calls = 0;
  const waits = [];
  const options = {
    fetcher: async (_url, options) => {
      assert.equal(options.method ?? 'GET', 'GET');
      assert.ok(options.signal instanceof AbortSignal);
      const answer = answers[Math.min(calls++, answers.length - 1)];
      if (answer === 'timeout') throw timeout();
      return new Response(JSON.stringify({ status: answer === 200 ? 'ready' : 'unavailable' }), {
        status: answer,
      });
    },
    wait: async (ms) => waits.push(ms),
  };
  return { options, waits, calls: () => calls };
}

test('startup 503 can recover before any account mutation begins', async () => {
  const { options, waits, calls } = fixture([503, 200]);
  const measurements = [];
  await waitForReadiness(candidate, measurements, options);
  assert.equal(calls(), 2);
  assert.deepEqual(waits, [1000]);
  assert.deepEqual(
    measurements.map((value) => value.status),
    [503, 200],
  );
});

test('a cold start that times out is tried again and recorded as a timeout', async () => {
  const { options, waits, calls } = fixture(['timeout', 'timeout', 200]);
  const measurements = [];
  await waitForReadiness(candidate, measurements, options);
  assert.equal(calls(), 3);
  assert.deepEqual(waits, [1000, 1000]);
  assert.deepEqual(
    measurements.map(({ path, status }) => [path, status]),
    [
      ['/health/ready', 'timeout'],
      ['/health/ready', 'timeout'],
      ['/health/ready', 200],
    ],
  );
  assert.ok(measurements.every(({ ms }) => Number.isInteger(ms)));
});

test('a body that stops arriving in time is retried and recorded as a timeout, not a 200', async () => {
  let calls = 0;
  const measurements = [];
  await waitForReadiness(candidate, measurements, {
    fetcher: async () => {
      calls++;
      if (calls > 1) return Response.json({ status: 'ready' });
      return {
        status: 200,
        json: async () => {
          throw timeout();
        },
      };
    },
    wait: async () => {},
  });
  assert.equal(calls, 2);
  assert.deepEqual(
    measurements.map(({ status }) => status),
    ['timeout', 200],
  );
});

test('persistent 503 fails after exactly five bounded GET probes', async () => {
  const { options, waits, calls } = fixture([503]);
  await assert.rejects(
    waitForReadiness(candidate, [], options),
    /^Error: Staging was not ready after 5 attempts: 5 returned HTTP 503$/,
  );
  assert.equal(calls(), 5);
  assert.equal(waits.length, 4);
});

test('five timeouts fail and say that no answer came, not that staging answered 503', async () => {
  const { options, calls } = fixture(['timeout']);
  await assert.rejects(
    waitForReadiness(candidate, [], options),
    /^Error: Staging was not ready after 5 attempts: 5 timed out after 5000 ms$/,
  );
  assert.equal(calls(), 5);
});

test('a mix of timeouts and 503 is counted per kind', async () => {
  const { options } = fixture(['timeout', 503, 'timeout', 503, 503]);
  await assert.rejects(
    waitForReadiness(candidate, [], options),
    /5 attempts: 2 timed out after 5000 ms, 3 returned HTTP 503$/,
  );
});

test('unexpected HTTP failures are not retried', async () => {
  for (const status of [401, 500]) {
    const { options, waits, calls } = fixture([status]);
    await assert.rejects(waitForReadiness(candidate, [], options), /HTTP/);
    assert.equal(calls(), 1);
    assert.equal(waits.length, 0);
  }
});

test('a 200 with an invalid readiness body never authorizes release', async () => {
  await assert.rejects(
    waitForReadiness(candidate, [], {
      fetcher: async () => new Response('{"status":"unavailable"}'),
      wait: async () => {},
    }),
    /Invalid/,
  );
});

test('transport failures other than a timeout are not retried or converted into success', async () => {
  let calls = 0;
  await assert.rejects(
    waitForReadiness(candidate, [], {
      fetcher: async () => {
        calls++;
        throw new TypeError('fetch failed');
      },
      wait: async () => {},
    }),
    /fetch failed/,
  );
  assert.equal(calls, 1);
});

test('a single request answers its status and JSON body, or fails as a recorded timeout', async () => {
  const measurements = [];
  assert.deepEqual(
    await timedGet(fixture([200]).options.fetcher, candidate, '/version.json', measurements),
    { status: 200, body: { status: 'ready' } },
  );
  assert.deepEqual(
    await timedGet(fixture([503]).options.fetcher, candidate, '/version.json', measurements),
    { status: 503 },
  );
  await assert.rejects(
    timedGet(fixture(['timeout']).options.fetcher, candidate, '/version.json', measurements),
    { name: 'TimeoutError' },
  );
  assert.deepEqual(
    measurements.map(({ status }) => status),
    [200, 503, 'timeout'],
  );
});
