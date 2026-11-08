import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  alertLabel,
  checkStaging,
  failedSteps,
  githubIssues,
  runOutcome,
  syncAlert,
} from './staging-alert.mjs';

const origin = 'https://staging.example';
const release = 'a'.repeat(40);

function site(routes) {
  const requested = [];
  const fetcher = async (url) => {
    requested.push(new URL(url).pathname);
    const route = routes[new URL(url).pathname];
    if (route instanceof Error) throw route;
    return new Response(JSON.stringify(route.body), { status: route.status });
  };
  return { fetcher, requested, wait: async () => {} };
}

test('healthy staging is ready and serves a release revision, each request timed', async () => {
  const { fetcher, wait } = site({
    '/health/ready': { status: 200, body: { status: 'ready' } },
    '/version.json': { status: 200, body: { revision: release } },
  });
  const result = await checkStaging(origin, { fetcher, wait });
  assert.equal(result.healthy, true);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(
    result.measurements.map(({ path, status }) => [path, status]),
    [
      ['/health/ready', 200],
      ['/version.json', 200],
    ],
  );
  assert.ok(result.measurements.every(({ ms }) => Number.isInteger(ms)));
});

test('a database that stays unavailable, a missing revision or no answer is unhealthy', async () => {
  const closed = await checkStaging(
    origin,
    site({
      '/health/ready': { status: 503, body: { status: 'unavailable' } },
      '/version.json': { status: 200, body: { revision: null } },
    }),
  );
  assert.equal(closed.healthy, false);
  assert.equal(closed.problems.length, 2);
  assert.equal(closed.measurements.filter(({ path }) => path === '/health/ready').length, 5);

  const unreachable = await checkStaging(
    origin,
    site({
      '/health/ready': new TypeError('fetch failed'),
      '/version.json': new TypeError('fetch failed'),
    }),
  );
  assert.equal(unreachable.healthy, false);
  assert.match(unreachable.problems.join('\n'), /fetch failed/);
});

test('a run is failing when any job fails and succeeds only when its decisive job ran', () => {
  const job = (name, conclusion, steps) => ({ name, conclusion, steps });
  assert.equal(
    runOutcome('staging', [job('prepare', 'success'), job('deploy', 'success')]),
    'succeeded',
  );
  assert.equal(
    runOutcome('staging', [job('prepare', 'success'), job('deploy', 'skipped')]),
    'unknown',
  );
  assert.equal(runOutcome('staging-backup', [job('backup', 'skipped')]), 'unknown');
  const failing = [
    job('prepare', 'success'),
    job('deploy', 'failure', [
      { name: 'npm ci', conclusion: 'success' },
      { name: 'Build candidate, migrate, smoke, then promote staging', conclusion: 'failure' },
    ]),
  ];
  assert.equal(runOutcome('staging', failing), 'failing');
  assert.deepEqual(failedSteps(failing), [
    'deploy → Build candidate, migrate, smoke, then promote staging',
  ]);
  assert.equal(runOutcome('staging-mail-retention', [job('cleanup', 'timed_out')]), 'failing');
});

function tracker(existing) {
  const calls = [];
  const issues = {
    findOpen: async (title) => {
      calls.push(['find', title]);
      return existing;
    },
    open: async (title, body) => {
      calls.push(['open', title, body]);
      return { number: 7 };
    },
    comment: async (number, body) => calls.push(['comment', number, body]),
    close: async (number) => calls.push(['close', number]),
  };
  return { issues, calls };
}

test('a failure opens one issue, a repeated failure leaves it, and recovery closes it', async () => {
  const alert = { source: 'health', details: ['就绪检查失败'], runUrl: 'https://run/1' };
  const first = tracker(undefined);
  assert.deepEqual(await syncAlert(first.issues, { ...alert, failing: true }), {
    action: 'opened',
    number: 7,
  });
  const [, title, body] = first.calls[1];
  assert.equal(title, 'staging 告警：health');
  assert.match(body, /- 就绪检查失败/);
  assert.match(body, /https:\/\/run\/1/);

  const again = tracker({ number: 7 });
  assert.deepEqual(await syncAlert(again.issues, { ...alert, failing: true }), {
    action: 'still-open',
    number: 7,
  });
  assert.equal(again.calls.length, 1);

  const recovered = tracker({ number: 7 });
  assert.deepEqual(await syncAlert(recovered.issues, { ...alert, failing: false }), {
    action: 'closed',
    number: 7,
  });
  assert.deepEqual(
    recovered.calls.slice(1).map(([kind, number]) => [kind, number]),
    [
      ['comment', 7],
      ['close', 7],
    ],
  );

  const quiet = tracker(undefined);
  assert.deepEqual(await syncAlert(quiet.issues, { ...alert, failing: false }), {
    action: 'none',
  });
});

test('the GitHub client labels alerts, creating the label once, and finds only issues', async () => {
  const requests = [];
  const fetcher = async (url, { method, headers, body }) => {
    const path = new URL(url).pathname + new URL(url).search;
    requests.push([method, path, body && JSON.parse(body)]);
    assert.equal(headers.authorization, 'Bearer token');
    if (method === 'GET' && path.startsWith('/repos/o/r/labels/'))
      return new Response('', { status: 404 });
    if (method === 'GET')
      return Response.json([
        { number: 3, title: 'staging 告警：health', pull_request: {} },
        { number: 4, title: 'staging 告警：health' },
      ]);
    return Response.json({ number: 9 }, { status: 201 });
  };
  const issues = githubIssues({ token: 'token', repository: 'o/r', fetcher });
  assert.equal((await issues.findOpen('staging 告警：health')).number, 4);
  assert.equal((await issues.open('staging 告警：health', 'body')).number, 9);
  assert.deepEqual(
    requests.map(([method, path]) => `${method} ${path}`),
    [
      `GET /repos/o/r/issues?state=open&labels=${alertLabel}&per_page=100`,
      `GET /repos/o/r/labels/${alertLabel}`,
      'POST /repos/o/r/labels',
      'POST /repos/o/r/issues',
    ],
  );
  assert.deepEqual(requests[3][2], {
    title: 'staging 告警：health',
    body: 'body',
    labels: [alertLabel],
  });
});
