async function followsMergedMain(options, run) {
  if (run.head_branch === 'main') return true;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data } = await options.api.repos.listPullRequestsAssociatedWithCommit({
      owner: options.owner,
      repo: options.repo,
      commit_sha: run.head_sha,
      per_page: 100,
    });
    const merged = data.some(
      (pr) =>
        pr.base.ref === 'main' &&
        pr.head.sha === run.head_sha &&
        pr.head.repo?.full_name === `${options.owner}/${options.repo}` &&
        pr.merged_at,
    );
    if (merged) return true;
    if (attempt < 5) await options.wait(3000);
  }
  return false;
}

async function triggerProblem(options) {
  if (options.eventName === 'workflow_dispatch') return undefined;
  const repository = `${options.owner}/${options.repo}`;
  const run = options.payload.workflow_run;
  if (run?.conclusion !== 'success' || run.head_repository?.full_name !== repository)
    return 'untrusted-or-unsuccessful';
  if (!(await followsMergedMain(options, run))) return 'not-merged';
  return undefined;
}

async function readMainCi(options) {
  const scope = { owner: options.owner, repo: options.repo };
  const { data: branch } = await options.api.repos.getBranch({ ...scope, branch: 'main' });
  const sha = branch.commit.sha;
  const { data } = await options.api.actions.listWorkflowRuns({
    ...scope,
    workflow_id: 'ci.yml',
    branch: 'main',
    head_sha: sha,
    per_page: 20,
  });
  const latest = data.workflow_runs.find(
    (run) =>
      run.head_sha === sha &&
      run.head_branch === 'main' &&
      ['push', 'workflow_dispatch'].includes(run.event),
  );
  return { sha, latest, afterRunId: latest?.id ?? 0 };
}

export async function selectMainRelease(options) {
  const problem = await triggerProblem(options);
  if (problem) return { ready: false, reason: problem };
  const { sha, latest, afterRunId } = await readMainCi(options);
  if (latest?.status === 'completed' && latest.conclusion === 'success')
    return { sha, ready: true, reason: 'ci-passed' };
  if (latest && latest.status !== 'completed') return { sha, ready: false, reason: 'ci-running' };
  if (latest && options.eventName !== 'workflow_dispatch')
    return { sha, ready: false, reason: 'ci-failed' };
  await options.api.actions.createWorkflowDispatch({
    owner: options.owner,
    repo: options.repo,
    workflow_id: 'ci.yml',
    ref: 'main',
  });
  return { sha, ready: false, reason: 'ci-dispatched', afterRunId };
}

export async function prepareMainRelease(options) {
  const selected = await selectMainRelease(options);
  if (!['ci-dispatched', 'ci-running'].includes(selected.reason)) return selected;
  for (let attempt = 0; attempt < 60; attempt++) {
    const { sha, latest } = await readMainCi(options);
    if (sha !== selected.sha) return { sha, ready: false, reason: 'superseded' };
    if (latest && latest.id > (selected.afterRunId ?? 0) && latest.status === 'completed') {
      if (latest.conclusion !== 'success') throw new Error('Main CI failed; staging not released');
      return { sha, ready: true, reason: 'ci-passed' };
    }
    await options.wait(10000);
  }
  throw new Error('Timed out waiting for main CI; staging not released');
}
