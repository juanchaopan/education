// 探针 #173：同一批合成提问分别走现有的文字反馈（baseline）和带讲解清单的反馈（demo），
// 两种请求都经过应用真实的 tutoring gateway（同一模型、流式 Responses、无推理、store: false），
// 记录耗时、用量、费用和回答。密钥只从环境变量读入并交给 gateway，从不写进输出。
//
// 运行：node --env-file=<密钥文件> --import tsx spike/173/run.ts [--dry] [--from=N] [--to=M]
// 每次运行把结果写进 docs/evidence/173/calls-<from>-<to>.json；所有运行合计的付费调用数
// 记在 budget.json 里，到 60 次就停。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gardenBalanceSteps } from '../../libs/problems/src/garden-balance.ts';
import { usageCost, TUTORING_MODEL, type BillingResult } from '../../apps/api/src/ai/domain/tutoring-cost.ts';
import { ModelFeedback, parseModelFeedback } from '../../apps/api/src/ai/domain/teaching-feedback.ts';
import { feedbackTask, type FeedbackModelInput } from '../../apps/api/src/ai/services/feedback-task.ts';
import type { ModelTask } from '../../apps/api/src/ai/services/model-task.ts';
import { createTutoringGateway } from '../../apps/api/src/ai/services/tutoring-gateway.ts';
import { menus, type Demo } from './menu.ts';
import { questions } from './questions.ts';

const CALL_CAP = 60;
const here = dirname(fileURLToPath(import.meta.url));
const evidence = resolve(here, '../../docs/evidence/173');
const budgetFile = resolve(evidence, 'budget.json');

function option(name: string, fallback: number) {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return found ? Number(found.split('=')[1]) : fallback;
}
const dry = process.argv.includes('--dry');
const from = option('from', 1);
const to = option('to', questions.length);

const DEMO_RULE =
  'demos 是题目作者为这一幕做好的动画讲解，每段有 id 和一句说明。孩子的问题正好能用其中一段' +
  '演示说明白时，demo 填那一段的 id，instruction 要和动画配合着说；没有合适的讲解、孩子跑题' +
  '或听不清时，demo 为 null。demo 只能从 demos 里选，最多一段。';

type DemoReply = ModelFeedback & { demo: string | null };

function withDemo(ids: readonly string[]) {
  const schema = JSON.parse(JSON.stringify(ModelFeedback));
  return {
    ...schema,
    properties: {
      ...schema.properties,
      demo: { anyOf: [{ type: 'string', enum: ids }, { type: 'null' }] },
    },
    required: [...schema.required, 'demo'],
  };
}

function parseDemoReply(text: string, ids: readonly string[]): DemoReply | undefined {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(text);
  } catch {
    return;
  }
  const { demo, ...rest } = value;
  if (demo !== null && !(typeof demo === 'string' && ids.includes(demo))) return;
  const feedback = parseModelFeedback(JSON.stringify(rest));
  return feedback && { ...feedback, demo };
}

// The text-only feedback request with the scene's menu added to the material
// and a demo id added to the strict output schema.
function demoTask(menu: readonly Demo[]): ModelTask<FeedbackModelInput, DemoReply> {
  const ids = menu.map((demo) => demo.id);
  return {
    maxOutputTokens: feedbackTask.maxOutputTokens,
    request(input) {
      const base = feedbackTask.request(input);
      if (!base || typeof base.content === 'string') return;
      const first = base.content[0];
      if (first?.type !== 'input_text') return;
      const material = { ...JSON.parse(first.text), demos: menu };
      return {
        instructions: base.instructions + DEMO_RULE,
        content: [{ type: 'input_text', text: JSON.stringify(material) }],
        format: { name: 'teaching_feedback_demo', schema: withDemo(ids) },
      };
    },
    accept: (text) => parseDemoReply(text, ids),
  };
}

// Captures what the model wrote before it is accepted, so a refused reply is still on record.
function recording<I, O>(task: ModelTask<I, O>, seen: { raw?: string }): ModelTask<I, O> {
  return {
    ...task,
    accept(text) {
      seen.raw = text;
      return task.accept(text);
    },
  };
}

type Variant = 'baseline' | 'demo';
type Call = {
  question: number;
  scene: string;
  variant: Variant;
  order: number;
  status: string;
  elapsedMs?: number;
  headersMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  feedbackStatus?: string;
  instruction?: string;
  confidence?: number;
  injection?: boolean;
  demo?: string | null;
  raw?: string;
};

const budget = { used: existsSync(budgetFile) ? JSON.parse(readFileSync(budgetFile, 'utf8')).used : 0 };

function spend() {
  budget.used += 1;
  mkdirSync(evidence, { recursive: true });
  writeFileSync(budgetFile, JSON.stringify({ cap: CALL_CAP, used: budget.used }, null, 2));
}

async function ask(variant: Variant, question: (typeof questions)[number], order: number): Promise<Call> {
  const step = gardenBalanceSteps[question.scene as keyof typeof gardenBalanceSteps];
  const input: FeedbackModelInput = { prompt: step.prompt, text: question.text };
  const seen: { raw?: string } = {};
  const task =
    variant === 'demo' ? recording(demoTask(menus[question.scene] ?? []), seen) : recording(feedbackTask, seen);
  const base: Call = { question: question.id, scene: question.scene, variant, order, status: 'skipped' };
  if (dry) {
    const request = task.request(input);
    console.log(JSON.stringify({ question: question.id, variant, content: request?.content, format: request?.format }));
    return base;
  }
  if (budget.used >= CALL_CAP) return { ...base, status: 'cap-reached' };
  spend();

  let billing: BillingResult = { status: 'unknown' };
  let headersMs: number | undefined;
  const send: typeof fetch = async (url, init) => {
    const started = performance.now();
    const response = await fetch(url, init);
    headersMs = performance.now() - started;
    return response;
  };
  const gateway = createTutoringGateway(
    { paidAiEnabled: true, eligible: true, apiKey: process.env.OPENAI_API_KEY ?? '' },
    { dispatch: (_credentials, start) => start(new AbortController().signal), confirm: async () => {} },
    {
      reserve: async () => 'spike',
      settle: async (_id, result) => {
        billing = result;
      },
    },
    send,
  );
  const result = await gateway(task as ModelTask<FeedbackModelInput, ModelFeedback | DemoReply>, {}, input);
  const usage = 'usage' in billing ? billing.usage : undefined;
  const call: Call = {
    ...base,
    status: result.status === 'ready' ? 'ready' : `fallback:${result.reason}`,
    headersMs,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    costUsd: usage ? Number(usageCost(usage)) / 1e9 : undefined,
    raw: seen.raw,
  };
  if (result.status !== 'ready') return call;
  const value = result.value as ModelFeedback & { demo?: string | null };
  return {
    ...call,
    elapsedMs: result.elapsedMs,
    feedbackStatus: value.status,
    instruction: value.instruction,
    confidence: value.confidence,
    injection: value.injection,
    ...(variant === 'demo' && { demo: value.demo ?? null }),
  };
}

async function main() {
  if (!dry && !process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const results: Call[] = [];
  // Alternating which variant goes first keeps drift in provider latency from
  // favouring either one.
  for (const question of questions.filter((q) => q.id >= from && q.id <= to)) {
    const variants: Variant[] = question.id % 2 ? ['demo', 'baseline'] : ['baseline', 'demo'];
    for (const variant of variants) {
      const call = await ask(variant, question, results.length + 1);
      results.push(call);
      if (!dry)
        console.log(
          `q${call.question}\t${call.variant}\t${call.status}\t${Math.round(call.elapsedMs ?? 0)}ms\t${call.demo ?? ''}\t${call.instruction ?? ''}`,
        );
      if (dry) return;
    }
  }
  if (dry) return;
  writeFileSync(
    resolve(evidence, `calls-${from}-${to}.json`),
    JSON.stringify({ model: TUTORING_MODEL, ranAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`paid calls used in total: ${budget.used}/${CALL_CAP}`);
}

await main();
