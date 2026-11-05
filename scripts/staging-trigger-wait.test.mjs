import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareMainRelease } from './staging-trigger.mjs';

const sha = 'a'.repeat(40);
const run = (id, status, conclusion = null) => ({
  id,
  head_sha: sha,
  head_branch: 'main',
  event: 'workflow_dispatch',
  status,
  conclusion,
});
function fixture(states, changed = false) {
  const events = [];
  let reads = 0;
  const options = {
    owner: 'juanchaopan',
    repo: 'education',
    eventName: 'workflow_dispatch',
    payload: {},
    wait: async () => events.push('wait'),
    api: {
      repos: {
        getBranch: async () => ({
          data: { commit: { sha: changed && reads > 0 ? 'b'.repeat(40) : sha } },
        }),
      },
      actions: {
        listWorkflowRuns: async () => ({
          data: { workflow_runs: states[Math.min(reads++, states.length - 1)] },
        }),
        createWorkflowDispatch: async () => events.push('dispatch'),
      },
    },
  };
  return { options, events };
}

test('one staging invocation dispatches, waits for real CI completion, then permits deployment', async () => {
  const { options, events } = fixture([
    [],
    [run(8, 'queued')],
    [run(8, 'in_progress')],
    [run(8, 'completed', 'success')],
  ]);
  assert.deepEqual(await prepareMainRelease(options), { sha, ready: true, reason: 'ci-passed' });
  assert.deepEqual(events, ['dispatch', 'wait', 'wait']);
});

test('existing CI is awaited without a duplicate dispatch', async () => {
  const { options, events } = fixture([[run(8, 'in_progress')], [run(8, 'completed', 'success')]]);
  assert.equal((await prepareMainRelease(options)).ready, true);
  assert.equal(events.includes('dispatch'), false);
});

test('failed new CI never permits deployment', async () => {
  const { options } = fixture([[], [run(8, 'completed', 'failure')]]);
  await assert.rejects(prepareMainRelease(options), /Main CI failed/);
});

test('manual retry ignores the old failure until a new run actually finishes', async () => {
  const { options, events } = fixture([
    [run(7, 'completed', 'failure')],
    [run(7, 'completed', 'failure')],
    [run(8, 'queued')],
    [run(8, 'completed', 'success')],
  ]);
  assert.equal((await prepareMainRelease(options)).ready, true);
  assert.deepEqual(events, ['dispatch', 'wait', 'wait']);
});

test('main advancing while CI runs prevents the old release', async () => {
  const { options } = fixture([[], [run(8, 'completed', 'success')]], true);
  assert.equal((await prepareMainRelease(options)).reason, 'superseded');
});

test('a runner that never finishes times out without permitting deployment', async () => {
  const { options, events } = fixture([[], [run(8, 'queued')]]);
  await assert.rejects(prepareMainRelease(options), /Timed out/);
  assert.equal(events.filter((value) => value === 'dispatch').length, 1);
});
