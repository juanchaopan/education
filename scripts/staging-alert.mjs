import { timedGet, waitForReadiness } from './staging-readiness.mjs';
import { releaseRevision } from './staging-release.mjs';

export const alertLabel = 'staging-alert';

// The job whose result says a staging workflow did its work. A run where that
// job was skipped, such as a release run for a pull request, proves nothing
// either way; any failed job in a run is an alert.
const decisiveJobs = {
  staging: 'deploy',
  'staging-backup': 'backup',
  'staging-mail-retention': 'cleanup',
  'staging-restore': 'restore',
};
const failed = new Set(['failure', 'timed_out', 'startup_failure']);

// Readiness with the release's own probe, then the release revision. Each
// request's status and time are kept; failures are described without any
// response body.
export async function checkStaging(origin, { fetcher = fetch, wait } = {}) {
  const measurements = [];
  const problems = [];
  try {
    await waitForReadiness(origin, measurements, { fetcher, wait });
  } catch (error) {
    problems.push(`就绪检查失败：${error.message}`);
  }
  try {
    const response = await timedGet(fetcher, origin, '/version.json', measurements);
    const body = response.status === 200 ? await response.json() : await response.arrayBuffer();
    if (!releaseRevision.test(body?.revision ?? '')) problems.push('版本文件没有有效的发布版本号');
  } catch (error) {
    problems.push(`版本文件读取失败：${error.message}`);
  }
  return { healthy: problems.length === 0, measurements, problems };
}

// How a completed staging workflow run ended: failing, succeeded, or nothing
// to say. A workflow without a deciding job could never close its alert, so it
// is refused rather than watched halfway.
export function runOutcome(workflow, jobs) {
  const decisiveJob = decisiveJobs[workflow];
  if (!decisiveJob) throw new Error(`No deciding job is known for workflow ${workflow}`);
  if (jobs.some(({ conclusion }) => failed.has(conclusion))) return 'failing';
  const decisive = jobs.find(({ name }) => name === decisiveJob);
  return decisive?.conclusion === 'success' ? 'succeeded' : 'unknown';
}

export function failedSteps(jobs) {
  return jobs.flatMap(({ name, conclusion, steps = [] }) => {
    if (!failed.has(conclusion)) return [];
    const step = steps.find((candidate) => failed.has(candidate.conclusion));
    return [step ? `${name} → ${step.name}` : name];
  });
}

// The staging alerts as GitHub issues with one label: GitHub notifies the
// repository's watchers when one opens.
export function githubIssues({ token, repository, fetcher = fetch }) {
  const api = async (method, path, body) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(body && { 'content-type': 'application/json' }),
      },
      ...(body && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404 && method === 'GET') return undefined;
    if (!response.ok) throw new Error(`GitHub ${method} ${path} failed (HTTP ${response.status})`);
    return response.json();
  };
  return {
    async findOpen(title) {
      const open = await api('GET', `/issues?state=open&labels=${alertLabel}&per_page=100`);
      return open?.find((issue) => issue.title === title && !issue.pull_request);
    },
    async open(title, body) {
      if (!(await api('GET', `/labels/${alertLabel}`)))
        await api('POST', '/labels', {
          name: alertLabel,
          color: 'b60205',
          description: 'staging 自动告警：恢复后自动关闭',
        });
      return api('POST', '/issues', { title, body, labels: [alertLabel] });
    },
    comment: (number, body) => api('POST', `/issues/${number}/comments`, { body }),
    close: (number) => api('PATCH', `/issues/${number}`, { state: 'closed' }),
    jobs: (run) => api('GET', `/actions/runs/${run}/jobs?per_page=100`),
  };
}

// One open issue per alert source. A failure opens it once, and a later run
// that fails again leaves it open without another notification; a success
// comments and closes it.
export async function syncAlert(issues, { source, failing, details, runUrl }) {
  const title = `staging 告警：${source}`;
  const open = await issues.findOpen(title);
  if (failing) {
    if (open) return { action: 'still-open', number: open.number };
    const body = [
      `${source} 检查失败，恢复后由下一次成功的运行自动关闭。`,
      '',
      ...details.map((line) => `- ${line}`),
      '',
      `运行记录：${runUrl}`,
    ].join('\n');
    const created = await issues.open(title, body);
    return { action: 'opened', number: created.number };
  }
  if (!open) return { action: 'none' };
  await issues.comment(open.number, `已恢复。运行记录：${runUrl}`);
  await issues.close(open.number);
  return { action: 'closed', number: open.number };
}
