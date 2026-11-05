import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareMainRelease } from './staging-trigger.mjs';

const sha = 'a'.repeat(40);
const head = 'b'.repeat(40);
function fixture({ runs = [], merged = true, foreign = false, eventName = 'workflow_run' } = {}) {
  let dispatches = 0;
  const options = {
    owner: 'juanchaopan',
    repo: 'education',
    eventName,
    wait: async () => {},
    payload: {
      workflow_run: {
        head_sha: head,
        head_branch: 'feature/example',
        head_repository: { full_name: foreign ? 'other/repository' : 'juanchaopan/education' },
        conclusion: 'success',
      },
    },
    api: {
      repos: {
        getBranch: async () => ({ data: { commit: { sha } } }),
        listPullRequestsAssociatedWithCommit: async () => ({
          data: [
            {
              base: { ref: 'main' },
              head: { sha: head, repo: { full_name: 'juanchaopan/education' } },
              merged_at: merged ? '2026-11-05T04:06:42Z' : null,
            },
          ],
        }),
      },
      actions: {
        listWorkflowRuns: async () => ({ data: { workflow_runs: runs } }),
        createWorkflowDispatch: async (args) => {
          assert.equal(args.workflow_id, 'ci.yml');
          assert.equal(args.ref, 'main');
          dispatches++;
        },
      },
    },
  };
  return { options, count: () => dispatches };
}

test('a bot merge with no push run explicitly dispatches real CI on main, never deploys immediately', async () => {
  const { options, count } = fixture();
  assert.deepEqual(await prepareMainRelease(options), {
    sha,
    ready: false,
    reason: 'ci-dispatched',
  });
  assert.equal(count(), 1);
});

test('only a successful exact-main CI run can release', async () => {
  const { options, count } = fixture({
    runs: [
      {
        head_sha: sha,
        head_branch: 'main',
        event: 'workflow_dispatch',
        status: 'completed',
        conclusion: 'success',
      },
    ],
  });
  assert.deepEqual(await prepareMainRelease(options), { sha, ready: true, reason: 'ci-passed' });
  assert.equal(count(), 0);
});

for (const status of ['queued', 'in_progress', 'completed']) {
  test(`existing ${status} CI is not duplicated or bypassed`, async () => {
    const { options, count } = fixture({
      runs: [
        {
          head_sha: sha,
          head_branch: 'main',
          event: 'push',
          status,
          conclusion: status === 'completed' ? 'failure' : null,
        },
      ],
    });
    assert.equal((await prepareMainRelease(options)).ready, false);
    assert.equal(count(), 0);
  });
}

for (const settings of [{ merged: false }, { foreign: true }]) {
  test(`ignores unmerged or foreign PR runs: ${JSON.stringify(settings)}`, async () => {
    const { options, count } = fixture(settings);
    assert.equal((await prepareMainRelease(options)).ready, false);
    assert.equal(count(), 0);
  });
}

test('manual retry still runs full CI and does not bypass a failed main check', async () => {
  const { options, count } = fixture({
    eventName: 'workflow_dispatch',
    runs: [
      {
        head_sha: sha,
        head_branch: 'main',
        event: 'push',
        status: 'completed',
        conclusion: 'failure',
      },
    ],
  });
  assert.equal((await prepareMainRelease(options)).ready, false);
  assert.equal(count(), 1);
});

test('an old-main or PR success is never reused for the current main', async () => {
  const { options, count } = fixture({
    runs: [
      {
        head_sha: head,
        head_branch: 'main',
        event: 'push',
        status: 'completed',
        conclusion: 'success',
      },
      {
        head_sha: sha,
        head_branch: 'feature/example',
        event: 'pull_request',
        status: 'completed',
        conclusion: 'success',
      },
    ],
  });
  assert.equal((await prepareMainRelease(options)).ready, false);
  assert.equal(count(), 1);
});
