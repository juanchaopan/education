import { timedGet, waitForReadiness } from './staging-readiness.mjs';
import { releaseRevision } from './staging-release.mjs';

export const alertLabel = 'staging-alert';
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
    const { body } = await timedGet(fetcher, origin, '/version.json', measurements);
    if (!releaseRevision.test(body?.revision ?? '')) problems.push('版本文件没有有效的发布版本号');
  } catch (error) {
    problems.push(`版本文件读取失败：${error.message}`);
  }
  return { healthy: problems.length === 0, measurements, problems };
}

// One probe request as an alert lists it: what came back, or that nothing
// came back in time, and how long it took.
export function measurementLine({ path, status, ms }) {
  const answer = status === 'timeout' ? '超时，没有回答' : `HTTP ${status}`;
  return `${path}：${answer}，${ms} ms`;
}

function failedStep({ name, steps = [] }) {
  const step = steps.find((candidate) => failed.has(candidate.conclusion));
  return step ? `${name} → ${step.name}` : name;
}

// What a staging workflow run says, one alert source per job: a job that
// failed raises its alert and a job that succeeded clears its own, so a
// failure in one job is closed only by that job working again. A job that was
// skipped, such as the release job of a run started by a pull request, says
// nothing, and so does a job still running, such as the job that reports the
// run it belongs to. A run that failed before any job started is an alert of
// the whole workflow, cleared by the next run in which a job succeeds.
export function runAlerts(workflow, conclusion, jobs) {
  const alerts = jobs.flatMap((job) => {
    const source = `${workflow}/${job.name}`;
    if (failed.has(job.conclusion))
      return [{ source, failing: true, details: [`失败的步骤：${failedStep(job)}`] }];
    return job.conclusion === 'success' ? [{ source, failing: false, details: [] }] : [];
  });
  if (jobs.length === 0 && failed.has(conclusion))
    alerts.push({ source: workflow, failing: true, details: [`运行没有启动：${conclusion}`] });
  else if (jobs.some((job) => job.conclusion === 'success'))
    alerts.push({ source: workflow, failing: false, details: [] });
  return alerts;
}

// The staging alerts as GitHub issues with one label. An issue that the
// Actions bot opens reaches only those who watch every activity of the
// repository, so each new alert is assigned to the person on call, whom GitHub
// notifies under its default settings.
export function githubIssues({ token, repository, assignee, fetcher = fetch }) {
  const api = async (method, path, body, { missing = false } = {}) => {
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
    if (missing && response.status === 404) return undefined;
    if (!response.ok) throw new Error(`GitHub ${method} ${path} failed (HTTP ${response.status})`);
    return response.json();
  };
  return {
    async findOpen(title) {
      const open = await api('GET', `/issues?state=open&labels=${alertLabel}&per_page=100`);
      return open.find((issue) => issue.title === title && !issue.pull_request);
    },
    async open(title, body) {
      if (!(await api('GET', `/labels/${alertLabel}`, undefined, { missing: true })))
        await api('POST', '/labels', {
          name: alertLabel,
          color: 'b60205',
          description: 'staging 自动告警：恢复后自动关闭',
        });
      return api('POST', '/issues', {
        title,
        body,
        labels: [alertLabel],
        ...(assignee && { assignees: [assignee] }),
      });
    },
    comment: (number, body) => api('POST', `/issues/${number}/comments`, { body }),
    close: (number) => api('PATCH', `/issues/${number}`, { state: 'closed' }),
    jobs: async (run) => (await api('GET', `/actions/runs/${run}/jobs?per_page=100`)).jobs,
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
