import { appendFile } from 'node:fs/promises';
import {
  checkStaging,
  githubIssues,
  measurementLine,
  runAlerts,
  syncAlert,
} from './staging-alert.mjs';

// A reserved name that never resolves (RFC 6761), so a drill fails the real
// probe without touching staging.
const drillOrigin = 'https://alert-drill.invalid';
const hour = 3_600_000;
const providerAlerts = {
  'provider-failing': 'AI 供应商在这一小时内多数调用没有可用回复',
  'reply-out-of-bounds': '本月有 AI 回复超出约定范围，本月的付费 AI 已暂停',
};
const env = process.env;
// New alerts go to the configured person on call, or else to the account that
// owns the repository.
const issues = githubIssues({
  token: env.GITHUB_TOKEN,
  repository: env.GITHUB_REPOSITORY,
  assignee: env.ALERT_ASSIGNEE || env.GITHUB_REPOSITORY_OWNER,
});
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
    ...measurements.map(measurementLine),
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
  const jobs = await issues.jobs(env.WORKFLOW_RUN_ID);
  const alerts = runAlerts(name, env.WORKFLOW_CONCLUSION, jobs);
  const lines = [`${name}：${env.WORKFLOW_CONCLUSION}`];
  for (const alert of alerts) {
    const result = await syncAlert(issues, { ...alert, runUrl: env.WORKFLOW_RUN_URL });
    lines.push(`${alert.source}：${alert.failing ? '失败' : '成功'}，告警 ${result.action}`);
  }
  if (!alerts.length) lines.push('这次运行没有执行任何任务，告警状态不变。');
  await summarize(lines);
}

// The last full clock hour of paid AI calls, by settlement, with tokens and
// cost. A late run still reports the hour before it, so delays leave no gap;
// only a run that never happens skips its hour. It reads counts only, so it
// needs no lock. The API build is loaded only here, so the other modes run
// without it.
async function usage() {
  const { maintenancePool } = await import('../apps/api/dist/shared/maintenance-pool.js');
  const { summarizeAiUsage } = await import('../apps/api/dist/database/ai-usage-report.js');
  const { stagingDatabases } = await import('./staging-database-env.mjs');
  const until = new Date(Math.floor(Date.now() / hour) * hour);
  const pool = maintenancePool(stagingDatabases(env).hosted, undefined, 10000);
  try {
    const report = await summarizeAiUsage(pool, { since: new Date(until.getTime() - hour), until });
    const { calls } = report;
    const details = report.alerts.map((alert) => providerAlerts[alert]);
    const lines = [
      `AI 用量 ${report.since} – ${report.until}`,
      `已结算 ${calls.settled}，无回复 ${calls.unknown}，超出范围 ${calls['out-of-bounds']}，未发出或被拒绝 ${calls.released}，进行中 ${calls.reserved}`,
      `输入 ${report.inputTokens} tokens，输出 ${report.outputTokens} tokens，计入预算 US$${report.costUsd.toFixed(6)}`,
      ...details,
    ];
    // An hour in which no call ended, with paid AI not paused, says nothing
    // about the provider, so the alert stays as it was.
    if (!report.observed) return await summarize([...lines, '没有结束的调用，告警状态不变。']);
    const result = await syncAlert(issues, {
      source: 'ai-provider',
      failing: details.length > 0,
      details,
      runUrl,
    });
    await summarize([...lines, `告警：${result.action}`]);
  } finally {
    await pool.end();
  }
}

const modes = { health, workflow, usage };
const mode = modes[process.argv[2]];
if (!mode) throw new Error('Usage: node scripts/staging-alerts.mjs health|workflow|usage');
await mode();
