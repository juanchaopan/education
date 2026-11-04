import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const workflow = readFileSync(
  new URL('../.github/workflows/auto-merge.yml', import.meta.url),
  'utf8',
);
const script = workflow.split('          script: |\n')[1];
assert.ok(script, 'Test the actual inline workflow script');

function fixture() {
  return {
    pr: {
      state: 'open',
      draft: false,
      base: { ref: 'main' },
      head: { repo: { full_name: 'owner/education' } },
      node_id: 'PR_12',
    },
    repository: { allow_auto_merge: true },
    branch: {
      protected: true,
      protection: { required_status_checks: { contexts: ['ci', 'commit-lint', 'risk-gate'] } },
    },
    number: '12',
    alreadyEnabled: false,
  };
}

async function execute(state) {
  const calls = [];
  const github = {
    rest: {
      pulls: { get: async () => ({ data: state.pr }) },
      repos: {
        get: async () => ({ data: state.repository }),
        getBranch: async (params) => {
          assert.equal(params.owner, 'owner');
          assert.equal(params.repo, 'education');
          assert.equal(params.branch, 'main');
          if (state.branchError) throw state.branchError;
          return { data: state.branch };
        },
      },
    },
    graphql: async (query, variables) => {
      assert.doesNotMatch(query, /branchProtectionRule/, 'Never request administration metadata');
      assert.equal(variables.id, 'PR_12');
      if (query.includes('mutation')) {
        assert.match(query, /enablePullRequestAutoMerge/);
        assert.match(query, /mergeMethod: SQUASH/);
        calls.push('enable');
        return {};
      }
      return { node: { autoMergeRequest: state.alreadyEnabled ? { enabledAt: 'now' } : null } };
    },
  };
  await runInNewContext(`(async () => {\n${script}\n})()`, {
    github,
    context: { repo: { owner: 'owner', repo: 'education' } },
    process: { env: { PR_NUMBER: state.number } },
    core: { notice() {} },
  });
  return calls;
}

test('enrolls a protected PR using branch metadata without administrator access', async () => {
  assert.deepEqual(await execute(fixture()), ['enable']);
});

test('already enrolled PR is unchanged', async () => {
  assert.deepEqual(await execute({ ...fixture(), alreadyEnabled: true }), []);
});

for (const [name, change] of [
  [
    'draft',
    (s) => {
      s.pr.draft = true;
    },
  ],
  [
    'closed',
    (s) => {
      s.pr.state = 'closed';
    },
  ],
  [
    'fork',
    (s) => {
      s.pr.head.repo.full_name = 'other/education';
    },
  ],
  [
    'other base',
    (s) => {
      s.pr.base.ref = 'release';
    },
  ],
]) {
  test(`does not enroll ${name} PR`, async () => {
    const state = fixture();
    change(state);
    assert.deepEqual(await execute(state), []);
  });
}

for (const [name, change, error] of [
  [
    'disabled auto-merge',
    (s) => {
      s.repository.allow_auto_merge = false;
    },
    /Allow auto-merge/,
  ],
  [
    'unprotected branch',
    (s) => {
      s.branch.protected = false;
    },
    /Protect main/,
  ],
  [
    'missing metadata',
    (s) => {
      delete s.branch.protection;
    },
    /Protect main/,
  ],
  [
    'API denied',
    (s) => {
      s.branchError = new Error('Forbidden');
    },
    /Forbidden/,
  ],
  [
    'invalid PR number',
    (s) => {
      s.number = 'no';
    },
    /positive PR number/,
  ],
]) {
  test(`fails closed for ${name}`, async () => {
    const state = fixture();
    change(state);
    await assert.rejects(execute(state), error);
  });
}

for (const context of ['ci', 'commit-lint', 'risk-gate']) {
  test(`fails closed when ${context} is not required`, async () => {
    const state = fixture();
    state.branch.protection.required_status_checks.contexts = [
      'ci',
      'commit-lint',
      'risk-gate',
    ].filter((name) => name !== context);
    await assert.rejects(execute(state), /Protect main/);
  });
}
