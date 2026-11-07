import { AI_HELP_TIMEOUT_MS } from '@education/contracts';
import type { AiHelpFallback } from '@education/contracts';
import { RequestError } from '../../shared/request-error.js';
import {
  type BillingResult,
  MAX_TUTORING_BODY_BYTES,
  reservationCostFor,
  TUTORING_MODEL,
  type Usage,
  withinTutoringBounds,
} from '../domain/tutoring-cost.js';
import type { ModelRequest, ModelTask } from './model-task.js';
import { readOpenAiResponse } from './openai-response.js';

type Credentials = { token?: string; csrf?: string };
type Settings = { paidAiEnabled: boolean; eligible: boolean; apiKey: string };
type InFlight = { response: Promise<Response> };
type Authorize = (
  credentials: Credentials,
  start: (signal: AbortSignal) => Promise<InFlight>,
) => Promise<InFlight>;
type Meter = {
  reserve(credentials: Credentials, amount: bigint): Promise<string | null>;
  settle(id: string, result: BillingResult): Promise<void>;
};

const ENDPOINT = 'https://api.openai.com/v1/responses';

function fallback(reason: AiHelpFallback) {
  return { status: 'fallback', reason } as const;
}

// Image data is priced by the provider's image tokens, not by its bytes, so only
// the text part of the request counts against the byte bound.
function mediaLength({ content }: ModelRequest) {
  if (typeof content === 'string') return 0;
  return content.reduce(
    (sum, part) => sum + (part.type === 'input_image' ? part.image_url.length : 0),
    0,
  );
}

function requestBody<I, O>(task: ModelTask<I, O>, input: I) {
  const request = task.request(input);
  if (!request) return;
  const body = JSON.stringify({
    model: TUTORING_MODEL,
    instructions: request.instructions,
    input: [{ role: 'user', content: request.content }],
    ...(request.format && {
      text: { format: { type: 'json_schema', strict: true, ...request.format } },
    }),
    reasoning: { effort: 'none' },
    max_output_tokens: task.maxOutputTokens,
    service_tier: 'default',
    store: false,
    stream: true,
  });
  if (Buffer.byteLength(body) - mediaLength(request) <= MAX_TUTORING_BODY_BYTES) return body;
}

function unavailable(settings: Settings): AiHelpFallback | undefined {
  if (!settings.paidAiEnabled) return 'disabled';
  if (!settings.apiKey) return 'missing-key';
  if (!settings.eligible) return 'ineligible';
}

async function bounded<T>(
  external: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController();
  const signal = external ? AbortSignal.any([external, controller.signal]) : controller.signal;
  if (signal.aborted) return fallback('cancelled');
  let stop!: (result: ReturnType<typeof fallback>) => void;
  const stopped = new Promise<ReturnType<typeof fallback>>((resolve) => {
    stop = resolve;
  });
  const cancel = () => stop(fallback(external?.aborted ? 'cancelled' : 'timeout'));
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(), AI_HELP_TIMEOUT_MS);
  try {
    return await Promise.race([run(signal), stopped]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
    controller.abort();
  }
}

function sendRequest(send: typeof fetch, apiKey: string, body: string, signal: AbortSignal) {
  const response = send(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    redirect: 'error',
    body,
    signal,
  });
  void response.catch(() => {});
  return { response };
}

function classifyBilling(
  status: number,
  result: { usage: Usage | null; unexpectedTier: boolean } | undefined,
  maxOutputTokens: number,
): BillingResult {
  // An authentication or permission rejection occurs before inference.
  if (status === 401 || status === 403) return { status: 'released' };
  const usage = result?.usage;
  if (result?.unexpectedTier || (usage && !withinTutoringBounds(usage, maxOutputTokens)))
    return { status: 'out-of-bounds', usage: usage ?? undefined };
  return usage ? { status: 'settled', usage } : { status: 'unknown' };
}

async function meteredRequest<I, O>(
  task: ModelTask<I, O>,
  meter: Meter,
  credentials: Credentials,
  dispatch: (onSend: () => void) => Promise<InFlight>,
) {
  const id = await meter.reserve(credentials, reservationCostFor(task.maxOutputTokens));
  if (!id) return fallback('usage-limited');
  let billing: BillingResult = { status: 'released' };
  try {
    const { response } = await dispatch(() => {
      billing = { status: 'unknown' };
    });
    const reply = await response;
    const result = await readOpenAiResponse(reply, task.accept);
    billing = classifyBilling(reply.status, result, task.maxOutputTokens);
    if (billing.status === 'out-of-bounds' || result?.value === undefined)
      return fallback('unavailable');
    return { status: 'ready', value: result.value, usage: result.usage } as const;
  } finally {
    await meter.settle(id, billing);
  }
}

export function createTutoringGateway(
  settings: Settings,
  authorize: Authorize,
  meter: Meter,
  send = fetch,
) {
  return async <I, O>(
    task: ModelTask<I, O>,
    credentials: Credentials,
    input: I,
    external?: AbortSignal,
  ) => {
    const reason = unavailable(settings);
    if (reason) return fallback(reason);
    const body = requestBody(task, input);
    if (!body) return fallback('invalid-input');
    const started = performance.now();
    try {
      return await bounded(external, async (signal) => {
        const result = await meteredRequest(task, meter, credentials, (onSend) =>
          authorize(credentials, async (authorizationSignal) => {
            const dispatchSignal = AbortSignal.any([signal, authorizationSignal]);
            dispatchSignal.throwIfAborted();
            onSend();
            return sendRequest(send, settings.apiKey, body, dispatchSignal);
          }),
        );
        if (result.status === 'fallback') return result;
        return {
          ...result,
          model: TUTORING_MODEL,
          elapsedMs: performance.now() - started,
        } as const;
      });
    } catch (error) {
      if (error instanceof RequestError && [401, 403].includes(error.statusCode))
        return fallback('unauthorized');
      return fallback('unavailable');
    }
  };
}
