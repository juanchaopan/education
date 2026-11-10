// 合并各次运行的记录，算出耗时分布、用量和费用，并按预先写下的可接受选择核对讲解 id。
// 运行：node --import tsx spike/173/report.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { questions } from './questions.ts';

type Call = {
  question: number;
  variant: 'baseline' | 'demo';
  status: string;
  elapsedMs?: number;
  headersMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  instruction?: string;
  demo?: string | null;
};

const evidence = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/evidence/173');
const runs = readdirSync(evidence).filter((name) => /^calls-\d+-\d+\.json$/.test(name));
const calls: Call[] = runs.flatMap((name) => JSON.parse(readFileSync(resolve(evidence, name), 'utf8')).results);

// Nearest-rank percentile, which never invents a value between two measurements.
function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

function summary(values: number[]) {
  const round = (n: number | undefined) => (n === undefined ? undefined : Math.round(n));
  return {
    n: values.length,
    p50: round(percentile(values, 50)),
    p95: round(percentile(values, 95)),
    max: round(Math.max(...values)),
  };
}

function variant(name: Call['variant']) {
  const all = calls.filter((call) => call.variant === name);
  const ready = all.filter((call) => call.status === 'ready');
  const billed = all.filter((call) => call.costUsd !== undefined);
  const mean = (pick: (call: Call) => number) => billed.reduce((sum, call) => sum + pick(call), 0) / billed.length;
  return {
    calls: all.length,
    ready: ready.length,
    elapsedMs: summary(ready.map((call) => call.elapsedMs ?? 0)),
    headersMs: summary(all.flatMap((call) => (call.headersMs === undefined ? [] : [call.headersMs]))),
    meanInputTokens: Math.round(mean((call) => call.inputTokens ?? 0)),
    meanOutputTokens: Math.round(mean((call) => call.outputTokens ?? 0)),
    meanCostUsd: mean((call) => call.costUsd ?? 0),
    totalCostUsd: billed.reduce((sum, call) => sum + (call.costUsd ?? 0), 0),
  };
}

const paired = questions.flatMap((question) => {
  const pair = (name: Call['variant']) => calls.find((call) => call.question === question.id && call.variant === name);
  const demo = pair('demo');
  const baseline = pair('baseline');
  return demo?.elapsedMs !== undefined && baseline?.elapsedMs !== undefined ? [demo.elapsedMs - baseline.elapsedMs] : [];
});

// A reply in the answer scene leaks when it says or confirms the count.
const leakPattern = /九|9|对[，。！]|是的|没错/;

const rows = questions.map((question) => {
  const demo = calls.find((call) => call.question === question.id && call.variant === 'demo');
  const baseline = calls.find((call) => call.question === question.id && call.variant === 'baseline');
  const chosen = demo?.status === 'ready' ? (demo.demo ?? null) : undefined;
  return {
    ...question,
    demoStatus: demo?.status,
    chosen,
    matchesKey: chosen !== undefined && question.accept.includes(chosen),
    demoReply: demo?.instruction,
    baselineReply: baseline?.instruction,
    leakFlag:
      question.scene === 'answer'
        ? { demo: leakPattern.test(demo?.instruction ?? ''), baseline: leakPattern.test(baseline?.instruction ?? '') }
        : undefined,
  };
});

const report = {
  demo: variant('demo'),
  baseline: variant('baseline'),
  pairedDelayMs: summary(paired),
  keyAccuracy: { matches: rows.filter((row) => row.matchesKey).length, of: rows.length },
  rows,
};
writeFileSync(resolve(evidence, 'summary.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
for (const row of rows)
  console.log(
    `${row.id}\t${row.scene}\t${row.chosen === undefined ? '(无回复)' : (row.chosen ?? 'null')}\t${row.matchesKey ? '符合' : '不符'}\t${row.leakFlag ? JSON.stringify(row.leakFlag) : ''}`,
  );
