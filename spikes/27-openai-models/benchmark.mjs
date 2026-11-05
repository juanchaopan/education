import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const key = process.env.SPIKE_OPENAI_API_KEY;
if (!key) {
  console.error('SPIKE_OPENAI_API_KEY is unavailable');
  process.exit(1);
}

const models = [
  { id: 'gpt-5.4-nano', reasoning: { effort: 'none' } },
  { id: 'gpt-6-luna', reasoning: { effort: 'none' } },
  { id: 'gpt-4.1-mini' },
];
const cases = [
  {
    id: 'fraction-misconception',
    prompt: '题目：同样大的两个圆，分别平均分成3份和4份，各涂1份。孩子说“4比3大，所以四分之一更大”。',
  },
  {
    id: 'place-value',
    prompt: '题目：用十位和个位表示 42。孩子说“4表示4个一，2表示2个十”。请给一个可以用积木操作的提示。',
  },
  {
    id: 'clear-drawing',
    prompt: '题目：找出图中的三角形。孩子说“蓝色图形是三角形”。请根据图中看得清的形状引导孩子自己核对。',
    image: 'shapes.png',
  },
  {
    id: 'ambiguous-drawing',
    prompt: '题目：画一个四边形。孩子说“我画完了”。图中线条可能没闭合，只有看清楚时才描述所见。无法确认时，请孩子检查或补画，不能替孩子判定对错。',
    image: 'gap.png',
  },
];
const instructions = '你是儿童解题助手。只用简体中文，最多两句。用第一句直接给一个可操作的小提示或澄清问题，不直接说答案。看不清就请孩子检查，不猜测。';
const api = 'https://api.openai.com/v1/responses';

async function contentFor(test) {
  const content = [{ type: 'input_text', text: test.prompt }];
  if (test.image) {
    const image = await readFile(new URL(test.image, import.meta.url));
    content.push({ type: 'input_image', image_url: 'data:image/png;base64,' + image.toString('base64'), detail: 'low' });
  }
  return content;
}

async function* events(body) {
  const decoder = new TextDecoder();
  let pending = '';
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    let newline = pending.indexOf('\n');
    while (newline !== -1) {
      const line = pending.slice(0, newline).trimEnd();
      pending = pending.slice(newline + 1);
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        yield JSON.parse(line.slice(6));
      }
      newline = pending.indexOf('\n');
    }
  }
}

function errorCode(code) {
  return ['insufficient_quota', 'rate_limit_exceeded', 'invalid_api_key', 'model_not_found',
    'unsupported_country_region_territory', 'unsupported_value', 'invalid_value',
    'invalid_request_error', 'server_error'].includes(code) ? code : 'other';
}

async function measure(model, test, sample, cancel = false) {
  const content = await contentFor(test);
  const controller = new AbortController();
  const start = performance.now();
  const elapsed = () => Math.round(performance.now() - start);
  const result = { model: model.id, case: test.id, sample, status: 'missing-terminal-event', text: '' };
  const deadline = setTimeout(() => controller.abort('deadline'), 10_000);
  try {
    const response = await fetch(api, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: controller.signal,
      body: JSON.stringify({
        model: model.id,
        reasoning: model.reasoning,
        instructions,
        input: [{ role: 'user', content }],
        max_output_tokens: 128,
        service_tier: 'default',
        store: false,
        stream: true,
      }),
    });
    result.http = response.status;
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      result.status = 'http-error';
      result.code = errorCode(payload.error?.code ?? payload.error?.type);
      result.parameter = ['model', 'reasoning.effort', 'max_output_tokens', 'service_tier', 'input'].includes(payload.error?.param)
        ? payload.error.param : undefined;
      return result;
    }
    for await (const event of events(response.body)) {
      if (event.type === 'response.output_text.delta' && event.delta.trim()) {
        result.firstTextMs ??= elapsed();
        result.text += event.delta;
        if (/[。？！]/u.test(result.text)) result.firstSentenceMs ??= elapsed();
        if (cancel) {
          controller.abort('probe-cancel');
          result.status = 'local-abort-after-first-delta';
          break;
        }
      }
      if (['response.completed', 'response.incomplete', 'response.failed', 'error'].includes(event.type)) {
        result.status = event.type;
        result.snapshot = event.response?.model;
        result.usage = event.response?.usage;
        break;
      }
    }
  } catch {
    result.status = controller.signal.aborted ? String(controller.signal.reason) : 'transport-or-stream-error';
  } finally {
    clearTimeout(deadline);
    result.totalMs = elapsed();
  }
  return result;
}

for (const test of cases) {
  for (let sample = 1; sample <= 3; sample++) {
    const measurements = await Promise.all(models.map((model) => measure(model, test, sample)));
    for (const measurement of measurements) console.log('MEASUREMENT ' + JSON.stringify(measurement));
  }
}

const cancelled = await measure(models[1], cases[0], 'cancel', true);
console.log('MEASUREMENT ' + JSON.stringify(cancelled));
