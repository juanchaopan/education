const ciFile = 'ci.yml';

const scope = ({ owner, repo }) => ({ owner, repo });
// CI runs that check main itself: started by a push or by a dispatch on main,
// never a pull request run whose success says nothing about the squash commit.
const checksMain = (run) =>
  run.head_branch === 'main' && ['push', 'workflow_dispatch'].includes(run.event);
// A completed job that succeeded.
const passed = (job) => job?.status === 'completed' && job.conclusion === 'success';

// GitHub may finish required checks before its native auto-merge completes.
async function followsMergedMain(options, run) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const { data } = await options.api.repos.listPullRequestsAssociatedWithCommit({
      ...scope(options),
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
    if (attempt < 24) await options.wait(5000);
  }
  return false;
}

async function mainHead(options) {
  const { data } = await options.api.repos.getBranch({ ...scope(options), branch: 'main' });
  return data.commit.sha;
}

// The newest CI run of the exact commit at the head of main.
async function mainCi(options) {
  const sha = await mainHead(options);
  const { data } = await options.api.actions.listWorkflowRuns({
    ...scope(options),
    workflow_id: ciFile,
    branch: 'main',
    head_sha: sha,
    per_page: 20,
  });
  const latest = data.workflow_runs.find((run) => run.head_sha === sha && checksMain(run));
  return { sha, latest };
}

// A CI run passed when its gate job `ci`, which needs every check, passed.
// The job that dispatches the release runs after the gate, so the run as a
// whole may still be running, or have failed in that job alone.
async function gatePassed(options, run) {
  const { data } = await options.api.actions.listJobsForWorkflowRun({
    ...scope(options),
    run_id: run.id,
    per_page: 100,
  });
  return passed(data.jobs.find((job) => job.name === 'ci'));
}

// Main's CI dispatches the release of its commit once it passes, so a run
// that finds no passing CI only has to start one.
async function startCi(options, sha) {
  await options.api.actions.createWorkflowDispatch({
    ...scope(options),
    workflow_id: ciFile,
    ref: 'main',
  });
  return { sha, ready: false, reason: 'ci-dispatched' };
}

// A pull request check completed. The auto-merge bot's push of the merge
// starts no CI, so this run starts main's CI once the pull request has merged
// and main has none yet. It never releases: a CI run that exists dispatches
// its own release when it passes, and a failed one is not run again.
async function afterPullRequest(options) {
  const run = options.payload.workflow_run;
  if (
    run?.conclusion !== 'success' ||
    run.head_repository?.full_name !== `${options.owner}/${options.repo}`
  )
    return { ready: false, reason: 'untrusted-or-unsuccessful' };
  if (!(await followsMergedMain(options, run))) return { ready: false, reason: 'not-merged' };
  const { sha, latest } = await mainCi(options);
  if (!latest) return startCi(options, sha);
  return {
    sha,
    ready: false,
    reason: latest.status === 'completed' ? 'ci-completed' : 'ci-running',
  };
}

// Main's CI dispatched its own run, which is still finishing the job that
// dispatched this release. A run for a commit that is no longer main's head
// releases nothing: the newer commit's CI releases that one.
async function afterMainCi(options, runId) {
  if (!/^\d+$/.test(runId)) throw new Error('The CI run to release must be a run id');
  const { data: run } = await options.api.actions.getWorkflowRun({
    ...scope(options),
    run_id: Number(runId),
  });
  if (run.path !== `.github/workflows/${ciFile}` || !checksMain(run))
    throw new Error('Only a CI run of main can release staging');
  if (!(await gatePassed(options, run))) return { ready: false, reason: 'ci-not-passed' };
  const sha = await mainHead(options);
  if (sha !== run.head_sha) return { ready: false, reason: 'superseded' };
  return { sha, ready: true, reason: 'ci-passed' };
}

// A maintainer's run leaves a running CI to release itself and releases main
// when its finished CI passed the gate. Otherwise it starts CI again, also
// after a failure, which is how a maintainer retries a failed check.
async function manual(options) {
  const { sha, latest } = await mainCi(options);
  if (latest && latest.status !== 'completed') return { sha, ready: false, reason: 'ci-running' };
  if (latest && (await gatePassed(options, latest)))
    return { sha, ready: true, reason: 'ci-passed' };
  return startCi(options, sha);
}

// What one staging run does. No path waits for CI: CI that is not done yet
// dispatches the release itself when it passes, however long it takes.
export function selectMainRelease(options) {
  if (options.eventName === 'workflow_run') return afterPullRequest(options);
  const ciRun = options.payload.inputs?.ci_run;
  return ciRun ? afterMainCi(options, ciRun) : manual(options);
}
