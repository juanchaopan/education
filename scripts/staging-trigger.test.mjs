import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectMainRelease } from './staging-trigger.mjs';

const main = 'a'.repeat(40);
const head = 'b'.repeat(40);
const older = 'c'.repeat(40);
const repository = 'juanchaopan/education';
const mainRun = (fields) => ({
  id: 8,
  path: '.github/workflows/ci.yml',
  head_sha: main,
  head_branch: 'main',
  event: 'workflow_dispatch',
  status: 'completed',
  conclusion: 'success',
  ...fields,
});
const job = (name, conclusion) => ({
  name,
  status: conclusion ? 'completed' : 'in_progress',
  conclusion,
});

// The GitHub API of a repository whose main is at `main`: the CI runs listed
// for it, one CI run to read, the jobs of CI run 8, and a pull request whose
// head is `head`. `merged` may be a function of the time waited so far.
function githubApi({ runs, run, jobs, merged }, calls) {
  const mergedNow = () => (typeof merged === 'function' ? merged(calls.waited) : merged);
  return {
    repos: {
      getBranch: async ({ branch }) => {
        assert.equal(branch, 'main');
        return { data: { commit: { sha: main } } };
      },
      listPullRequestsAssociatedWithCommit: async () => ({
        data: [
          {
            base: { ref: 'main' },
            head: { sha: head, repo: { full_name: repository } },
            merged_at: mergedNow() ? '2026-11-05T04:06:42Z' : null,
          },
        ],
      }),
    },
    actions: {
      listWorkflowRuns: async (args) => {
        assert.equal(args.workflow_id, 'ci.yml');
        assert.equal(args.head_sha, main);
        return { data: { workflow_runs: runs } };
      },
      getWorkflowRun: async ({ run_id }) => {
        assert.equal(run_id, 8);
        return { data: run };
      },
      listJobsForWorkflowRun: async ({ run_id }) => {
        assert.equal(run_id, 8);
        return { data: { jobs } };
      },
      createWorkflowDispatch: async (args) => {
        assert.equal(args.workflow_id, 'ci.yml');
        assert.equal(args.ref, 'main');
        calls.dispatches++;
      },
    },
  };
}

function fixture({
  eventName = 'workflow_run',
  inputs = {},
  runs = [],
  run = mainRun(),
  jobs = [job('ci', 'success')],
  merged = true,
  foreign = false,
} = {}) {
  const calls = { dispatches: 0, waited: 0 };
  const options = {
    owner: 'juanchaopan',
    repo: 'education',
    eventName,
    wait: async (ms) => {
      calls.waited += ms;
    },
    payload: {
      inputs,
      workflow_run: {
        head_sha: head,
        head_branch: 'feature/example',
        head_repository: { full_name: foreign ? 'other/repository' : repository },
        conclusion: 'success',
      },
    },
    api: githubApi({ runs, run, jobs, merged }, calls),
  };
  return { options, calls };
}

test('a merged pull request starts main CI once and never releases by itself', async () => {
  const { options, calls } = fixture();
  assert.deepEqual(await selectMainRelease(options), {
    sha: main,
    ready: false,
    reason: 'ci-dispatched',
  });
  assert.equal(calls.dispatches, 1);
  assert.equal(calls.waited, 0);
});

test('a pull request finds main CI already there and leaves the release to it', async () => {
  for (const [status, conclusion, reason] of [
    ['queued', null, 'ci-running'],
    ['in_progress', null, 'ci-running'],
    ['completed', 'success', 'ci-completed'],
    ['completed', 'failure', 'ci-completed'],
  ]) {
    const { options, calls } = fixture({ runs: [mainRun({ status, conclusion })] });
    assert.deepEqual(await selectMainRelease(options), { sha: main, ready: false, reason });
    assert.equal(calls.dispatches, 0, `${status} ${conclusion}`);
  }
});

test('waits for a delayed native auto-merge before starting main CI', async () => {
  const { options, calls } = fixture({ merged: (waited) => waited >= 30000 });
  assert.equal((await selectMainRelease(options)).reason, 'ci-dispatched');
  assert.equal(calls.dispatches, 1);
  assert.equal(calls.waited, 30000);
});

test('an unmerged, foreign or failed pull request run starts nothing', async () => {
  const unmerged = fixture({ merged: false });
  assert.deepEqual(await selectMainRelease(unmerged.options), {
    ready: false,
    reason: 'not-merged',
  });
  assert.equal(unmerged.calls.waited, 120000);
  assert.equal(unmerged.calls.dispatches, 0);

  const foreign = fixture({ foreign: true });
  assert.equal((await selectMainRelease(foreign.options)).reason, 'untrusted-or-unsuccessful');
  const failed = fixture();
  failed.options.payload.workflow_run.conclusion = 'failure';
  assert.equal((await selectMainRelease(failed.options)).reason, 'untrusted-or-unsuccessful');
  assert.equal(foreign.calls.dispatches + failed.calls.dispatches, 0);
});

test('a pull request success or an older main success never counts for current main', async () => {
  const { options, calls } = fixture({
    runs: [
      mainRun({ head_sha: older }),
      mainRun({ head_branch: 'feature/example', event: 'pull_request' }),
    ],
  });
  assert.equal((await selectMainRelease(options)).reason, 'ci-dispatched');
  assert.equal(calls.dispatches, 1);
});

const dispatched = (settings = {}) =>
  fixture({ eventName: 'workflow_dispatch', inputs: { ci_run: '8' }, ...settings });

test('main CI that passed its gate releases its commit while the dispatching job still runs', async () => {
  const { options, calls } = dispatched({
    run: mainRun({ status: 'in_progress', conclusion: null }),
    jobs: [job('app', 'success'), job('ci', 'success'), job('release-staging', null)],
  });
  assert.deepEqual(await selectMainRelease(options), {
    sha: main,
    ready: true,
    reason: 'ci-passed',
  });
  assert.equal(calls.dispatches, 0);
});

test('a CI run for a commit that is no longer main releases nothing and starts nothing', async () => {
  const { options, calls } = dispatched({ run: mainRun({ head_sha: older }) });
  assert.deepEqual(await selectMainRelease(options), { ready: false, reason: 'superseded' });
  assert.equal(calls.dispatches, 0);
});

test('a dispatched CI run whose gate did not pass releases nothing and is not run again', async () => {
  for (const jobs of [
    [job('ci', 'failure')],
    [job('ci', 'cancelled')],
    [job('ci', null)],
    [job('app', 'success')],
  ]) {
    const { options, calls } = dispatched({ jobs });
    assert.deepEqual(await selectMainRelease(options), { ready: false, reason: 'ci-not-passed' });
    assert.equal(calls.dispatches, 0);
  }
});

test('only a CI run of main itself can be handed to staging', async () => {
  for (const run of [
    mainRun({ head_branch: 'feature/example', event: 'pull_request' }),
    mainRun({ path: '.github/workflows/staging.yml' }),
  ]) {
    await assert.rejects(selectMainRelease(dispatched({ run }).options), /Only a CI run of main/);
  }
  await assert.rejects(
    selectMainRelease(dispatched({ inputs: { ci_run: '8; rm -rf /' } }).options),
    /run id/,
  );
});

const manual = (runs, jobs) => fixture({ eventName: 'workflow_dispatch', runs, jobs });

test('a maintainer releases main at once when its finished CI passed the gate', async () => {
  for (const [run, jobs] of [
    [mainRun({ event: 'push' }), undefined],
    [mainRun({ conclusion: 'failure' }), [job('ci', 'success'), job('release-staging', 'failure')]],
  ]) {
    const { options, calls } = manual([run], jobs);
    assert.deepEqual(await selectMainRelease(options), {
      sha: main,
      ready: true,
      reason: 'ci-passed',
    });
    assert.equal(calls.dispatches, 0);
  }
});

test('a maintainer leaves running CI to release itself, without waiting or a second run', async () => {
  const { options, calls } = manual([mainRun({ status: 'in_progress', conclusion: null })]);
  assert.deepEqual(await selectMainRelease(options), {
    sha: main,
    ready: false,
    reason: 'ci-running',
  });
  assert.equal(calls.dispatches, 0);
  assert.equal(calls.waited, 0);
});

test('a maintainer starts CI when main has none or its gate failed, and returns at once', async () => {
  for (const [runs, jobs] of [
    [[], undefined],
    [[mainRun({ conclusion: 'failure' })], [job('app', 'failure'), job('ci', 'failure')]],
  ]) {
    const { options, calls } = manual(runs, jobs);
    assert.deepEqual(await selectMainRelease(options), {
      sha: main,
      ready: false,
      reason: 'ci-dispatched',
    });
    assert.equal(calls.dispatches, 1);
    assert.equal(calls.waited, 0);
  }
});
