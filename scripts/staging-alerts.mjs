import { appendFile } from 'node:fs/promises';
import {
  checkStaging,
  failedSteps,
  githubIssues,
  runOutcome,
  syncAlert,
} from './staging-alert.mjs';

// A reserved name that never resolves (RFC 6761), so a drill fails the real
// probe without touching staging.
const drillOrigin = 'https://alert-drill.invalid';
const env = process.env;
const issues = githubIssues({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY });
const runUrl = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;

async function summarize(lines) {
  const text = `${lines.join('\n')}\n`;
  console.log(text);
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, text);
}

async function health() {
  const drill = env.ALERT_DRILL === 'true';
  const origin = drill ? drillOrigin : env.STAGING_ORIGIN;
  if (!origin) throw new Error('Missing STAGING_ORIGIN');
  const { healthy, measurements, problems } = await checkStaging(origin);
  const details = [
    ...(drill ? [`告警演练：探测 ${drillOrigin}，这个保留域名必然无法解析`] : []),
    ...problems,
    ...measurements.map(({ path, status, ms }) => `${path}：HTTP ${status}，${ms} ms`),
  ];
  const result = await syncAlert(issues, { source: 'health', failing: !healthy, details, runUrl });
  await summarize([
    `staging ${healthy ? '正常' : '异常'}：${origin}`,
    ...details,
    `告警：${result.action}`,
  ]);
}

async function workflow() {
  const name = env.WORKFLOW_NAME;
  const { jobs } = await issues.jobs(env.WORKFLOW_RUN_ID);
  const outcome = runOutcome(name, jobs);
  if (outcome === 'unknown')
    return summarize([`${name} 的这次运行没有执行决定性的任务，告警状态不变。`]);
  const result = await syncAlert(issues, {
    source: name,
    failing: outcome === 'failing',
    details: failedSteps(jobs).map((step) => `失败的步骤：${step}`),
    runUrl: env.WORKFLOW_RUN_URL,
  });
  await summarize([`${name}：${outcome}`, `告警：${result.action}`]);
}

const modes = { health, workflow };
const mode = modes[process.argv[2]];
if (!mode) throw new Error('Usage: node scripts/staging-alerts.mjs health|workflow');
await mode();
