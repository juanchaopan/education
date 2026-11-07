import {
  type BillingResult,
  MAX_TUTORING_BODY_BYTES,
  reservationCostFor,
  TUTORING_MODEL,
  type Usage,
  withinTutoringBounds,
} from '../domain/tutoring-cost.js';
import {
  type Authorize,
  type Credentials,
  createMeteredCall,
  type Meter,
  type ProviderExchange,
  type ProviderSettings,
} from './metered-call.js';
import type { ModelRequest, ModelTask } from './model-task.js';
import { readOpenAiResponse } from './openai-response.js';
import { rejectedBeforeWork } from './provider-reply.js';

const ENDPOINT = 'https://api.openai.com/v1/responses';

// Image data is priced by the provider's image tokens, not by its bytes, so only
// the text part of the request counts against the byte bound.
function mediaLength({ content }: ModelRequest) {
  if (typeof content === 'string') return 0;
  return content.reduce(
    (sum, part) => sum + (part.type === 'input_image' ? part.image_url.length : 0),
    0,
  );
}

function requestBody<I, O>(task: ModelTask<I, O>, input: I, model: string) {
  const request = task.request(input);
  if (!request) return;
  const body = JSON.stringify({
    model,
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

function classifyBilling(
  status: number,
  result: { usage: Usage | null; unexpectedTier: boolean } | undefined,
  maxOutputTokens: number,
): BillingResult {
  if (rejectedBeforeWork(status)) return { status: 'released' };
  const usage = result?.usage;
  if (result?.unexpectedTier || (usage && !withinTutoringBounds(usage, maxOutputTokens)))
    return { status: 'out-of-bounds', usage: usage ?? undefined };
  return usage ? { status: 'settled', usage } : { status: 'unknown' };
}

function responsesExchange<I, O>(
  task: ModelTask<I, O>,
  input: I,
  apiKey: string,
  send: typeof fetch,
): ProviderExchange<O> | undefined {
  const model = TUTORING_MODEL;
  const body = requestBody(task, input, model);
  if (!body) return;
  return {
    model,
    reservation: reservationCostFor(task.maxOutputTokens),
    send: (signal) =>
      send(ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        redirect: 'error',
        body,
        signal,
      }),
    async read(reply) {
      const result = await readOpenAiResponse(reply, task.accept);
      return {
        value: result?.value,
        billing: classifyBilling(reply.status, result, task.maxOutputTokens),
      };
    },
  };
}

export function createTutoringGateway(
  settings: ProviderSettings,
  authorize: Authorize,
  meter: Meter,
  send = fetch,
) {
  const call = createMeteredCall(settings, authorize, meter);
  return <I, O>(
    task: ModelTask<I, O>,
    credentials: Credentials,
    input: I,
    external?: AbortSignal,
  ) => call(() => responsesExchange(task, input, settings.apiKey, send), credentials, external);
}
