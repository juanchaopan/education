import { appendFile } from 'node:fs/promises';
import { maintenancePool } from '../apps/api/dist/shared/maintenance-pool.js';
import { summarizeAiUsage } from '../apps/api/dist/database/ai-usage-report.js';
import { stagingDatabases } from './staging-database-env.mjs';

const alerts = {
  'provider-failing': 'AI 供应商在过去一小时内多数请求没有可用回复',
  'reply-out-of-bounds': '有 AI 回复超出约定范围，本月的付费 AI 已暂停',
};

// The last hour of paid AI calls, by settlement, with tokens and cost. It reads
// counts only, so it needs no lock, and it fails the run when the provider is
// failing, which raises the maintenance alert.
const { hosted } = stagingDatabases(process.env);
const pool = maintenancePool(hosted, undefined, 10000);
try {
  const until = new Date();
  const report = await summarizeAiUsage(pool, {
    since: new Date(until.getTime() - 3_600_000),
    until,
  });
  const { calls } = report;
  const lines = [
    `AI 用量 ${report.since} – ${report.until}`,
    `已结算 ${calls.settled}，无回复 ${calls.unknown}，超出范围 ${calls['out-of-bounds']}，未发送 ${calls.released}，进行中 ${calls.reserved}`,
    `输入 ${report.inputTokens} tokens，输出 ${report.outputTokens} tokens，计入预算 US$${report.costUsd.toFixed(6)}`,
    ...report.alerts.map((alert) => `告警：${alerts[alert]}`),
  ];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n\n')}\n`);
  if (report.alerts.length) process.exitCode = 1;
} finally {
  await pool.end();
}
