import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  alertLabel,
  checkStaging,
  githubIssues,
  measurementLine,
  runAlerts,
  syncAlert,
} from './staging-alert.mjs';

const origin = 'https://staging.example';
const release = 'a'.repeat(40);

function site(routes) {
  const fetcher = async (url) => {
    const route = routes[new URL(url).pathname];
    if (route instanceof Error) throw route;
    return new Response(JSON.stringify(route.body), { status: route.status });
  };
  return { fetcher, wait: async () => {} };
}

test('healthy staging is ready and serves a release revision, each request timed', async () => {
  const result = await checkStaging(
    origin,
    site({
      '/health/ready': { status: 200, body: { status: 'ready' } },
      '/version.json': { status: 200, body: { revision: release } },
    }),
  );
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
  assert.match(closed.problems[0], /returned HTTP 503/);
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

test('staging that never answers in time is reported as timing out, not as an error status', async () => {
  const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  const result = await checkStaging(
    origin,
    site({ '/health/ready': timeout, '/version.json': timeout }),
  );
  assert.equal(result.healthy, false);
  assert.deepEqual(result.problems, [
    '就绪检查失败：Staging was not ready after 5 attempts: 5 timed out after 5000 ms',
    '版本文件读取失败：The operation was aborted due to timeout',
  ]);
  assert.deepEqual(
    result.measurements.map(({ path, status }) => [path, status]),
    [...Array(5).fill(['/health/ready', 'timeout']), ['/version.json', 'timeout']],
  );
});

test('an alert lists each request by what came back, or that nothing did, and its time', () => {
  assert.equal(
    measurementLine({ path: '/health/ready', status: 'timeout', ms: 5003 }),
    '/health/ready：超时，没有回答，5003 ms',
  );
  assert.equal(
    measurementLine({ path: '/version.json', status: 200, ms: 87 }),
    '/version.json：HTTP 200，87 ms',
  );
});

const job = (name, conclusion, steps) => ({ name, conclusion, steps });
const outcomes = (alerts) => alerts.map(({ source, failing }) => [source, failing]);

test('each job raises its own alert when it fails and clears it when it succeeds', () => {
  const failing = runAlerts('staging', 'failure', [
    job('prepare', 'success'),
    job('deploy', 'failure', [
      { name: 'npm ci', conclusion: 'success' },
      { name: 'Build candidate, migrate, smoke, then promote staging', conclusion: 'failure' },
    ]),
  ]);
  assert.deepEqual(outcomes(failing), [
    ['staging/prepare', false],
    ['staging/deploy', true],
    ['staging', false],
  ]);
  assert.deepEqual(failing[1].details, [
    '失败的步骤：deploy → Build candidate, migrate, smoke, then promote staging',
  ]);
  assert.deepEqual(
    outcomes(runAlerts('staging-mail-retention', 'failure', [job('cleanup', 'timed_out')])),
    [['staging-mail-retention/cleanup', true]],
  );
});

test('a skipped job says nothing, so a pull request run cannot close a release alert', () => {
  assert.deepEqual(
    outcomes(
      runAlerts('staging', 'success', [job('prepare', 'success'), job('deploy', 'skipped')]),
    ),
    [
      ['staging/prepare', false],
      ['staging', false],
    ],
  );
  assert.deepEqual(runAlerts('staging-backup', 'success', [job('backup', 'skipped')]), []);
});

test('the job reporting its own run is still running and says nothing about itself', () => {
  assert.deepEqual(
    outcomes(
      runAlerts('staging', 'failure', [
        job('prepare', 'success'),
        job('deploy', 'failure'),
        job('alerts / report', null),
      ]),
    ),
    [
      ['staging/prepare', false],
      ['staging/deploy', true],
      ['staging', false],
    ],
  );
});

test('a run that never started alerts the whole workflow', () => {
  assert.deepEqual(runAlerts('staging-backup', 'startup_failure', []), [
    { source: 'staging-backup', failing: true, details: ['运行没有启动：startup_failure'] },
  ]);
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

function github(respond, assignee) {
  const requests = [];
  const fetcher = async (url, { method, headers, body }) => {
    const path = new URL(url).pathname + new URL(url).search;
    requests.push([method, path, body && JSON.parse(body)]);
    assert.equal(headers.authorization, 'Bearer token');
    return respond(method, path);
  };
  const issues = githubIssues({ token: 'token', repository: 'o/r', assignee, fetcher });
  return { requests, issues };
}

function alertRepository(method, path) {
  if (method === 'GET' && path.startsWith('/repos/o/r/labels/'))
    return new Response('', { status: 404 });
  if (method === 'GET')
    return Response.json([
      { number: 3, title: 'staging 告警：health', pull_request: {} },
      { number: 4, title: 'staging 告警：health' },
    ]);
  return Response.json({ number: 9 }, { status: 201 });
}

test('the GitHub client labels and assigns alerts, creating the label once, and finds only issues', async () => {
  const { requests, issues } = github(alertRepository, 'on-call');
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
    assignees: ['on-call'],
  });
});

test('an alert with nobody on call is opened unassigned', async () => {
  const { requests, issues } = github(alertRepository, '');
  await issues.open('staging 告警：health', 'body');
  assert.deepEqual(requests.at(-1)[2], {
    title: 'staging 告警：health',
    body: 'body',
    labels: [alertLabel],
  });
});

test('a run whose jobs cannot be read fails with the request that failed', async () => {
  const { issues } = github(() => new Response('', { status: 404 }));
  await assert.rejects(
    issues.jobs(42),
    /GitHub GET \/actions\/runs\/42\/jobs\?per_page=100 failed \(HTTP 404\)/,
  );
});
