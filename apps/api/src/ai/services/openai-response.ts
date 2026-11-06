import type { Usage } from '../domain/tutoring-cost.js';

const MAX_STREAM_BYTES = 65_536;
const MAX_HINT_LENGTH = 160;

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function usage(value: unknown): Usage | null {
  const { input_tokens, output_tokens } = object(value);
  return count(input_tokens) && count(output_tokens)
    ? { inputTokens: input_tokens, outputTokens: output_tokens }
    : null;
}

function assistantText(output: unknown) {
  if (!Array.isArray(output)) return;
  const messages = output.map(object).filter((item) => item.type === 'message');
  const message = messages[0];
  if (messages.length !== 1 || message?.role !== 'assistant') return;
  const { content } = message;
  if (!Array.isArray(content) || content.length !== 1) return;
  const { type, text } = object(content[0]);
  if (type === 'output_text' && typeof text === 'string') return text.trim();
}

function hint(output: unknown) {
  const sentence = assistantText(output);
  if (sentence && sentence.length <= MAX_HINT_LENGTH && !/[\r\n]/.test(sentence)) return sentence;
}

function streamEvent(frame: string) {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n');
  return data ? object(JSON.parse(data)) : {};
}

async function* frames(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const delimiter = /\r?\n\r?\n/;
  let bytes = 0;
  let buffered = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      bytes += value.byteLength;
      if (bytes > MAX_STREAM_BYTES) return;
      buffered += decoder.decode(value, { stream: true });
      for (let boundary = delimiter.exec(buffered); boundary; boundary = delimiter.exec(buffered)) {
        yield buffered.slice(0, boundary.index);
        buffered = buffered.slice(boundary.index + boundary[0].length);
      }
    }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function isEventStream(response: Response) {
  const mime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  return response.ok && mime === 'text/event-stream';
}

function terminalResult(eventType: string, response: unknown) {
  const { status, output, usage: tokens, service_tier: tier } = object(response);
  return {
    text: eventType === 'response.completed' && status === 'completed' ? hint(output) : undefined,
    usage: usage(tokens),
    unexpectedTier: tier != null && tier !== 'default',
  };
}

export async function readOpenAiResponse(response: Response) {
  if (!response.body || !isEventStream(response)) {
    void response.body?.cancel().catch(() => {});
    return;
  }
  for await (const frame of frames(response.body)) {
    const { type, response: terminal } = streamEvent(frame);
    switch (type) {
      case 'error':
        return;
      case 'response.completed':
      case 'response.failed':
      case 'response.incomplete':
        return terminalResult(type, terminal);
    }
  }
}
