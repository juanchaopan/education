import type { TranscriptionFormat } from '@education/contracts';
import {
  acceptTranscript,
  TRANSCRIPTION_MODEL,
  transcriptionCharge,
  transcriptionReservation,
} from '../domain/transcription.js';
import {
  type Authorize,
  type Credentials,
  createMeteredCall,
  type Meter,
  type ProviderExchange,
  type ProviderSettings,
} from './metered-call.js';
import { isSuccessful, type JsonObject, object, rejectedBeforeWork } from './provider-reply.js';

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_REPLY_BYTES = 16_384;
const files = {
  webm: { name: 'answer.webm', type: 'audio/webm' },
  mp4: { name: 'answer.m4a', type: 'audio/mp4' },
} as const;

// The recording, its container, and the step's own words as a recognition hint.
// Nothing identifies the child, and the audio is held only for this request.
export type TranscriptionInput = { audio: Buffer; format: TranscriptionFormat; prompt?: string };

function form({ audio, format, prompt }: TranscriptionInput) {
  const body = new FormData();
  body.set('model', TRANSCRIPTION_MODEL);
  body.set('languages[]', 'zh-cn');
  body.set('response_format', 'json');
  if (prompt) body.set('prompt', prompt);
  // The Blob copies the bytes it is given, so the decoded recording is not copied first.
  const file = new Blob([audio as Uint8Array<ArrayBuffer>], { type: files[format].type });
  body.set('file', file, files[format].name);
  return body;
}

async function boundedBytes(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (let next = await reader.read(); !next.done; next = await reader.read()) {
      bytes += next.value.byteLength;
      if (bytes > MAX_REPLY_BYTES) return;
      chunks.push(next.value);
    }
    return Buffer.concat(chunks);
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function readReply(response: Response): Promise<JsonObject | undefined> {
  if (!response.body || !isSuccessful(response, 'application/json')) {
    void response.body?.cancel().catch(() => {});
    return;
  }
  const bytes = await boundedBytes(response.body);
  if (!bytes) return;
  try {
    return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  } catch {
    return;
  }
}

function transcriptionExchange(
  input: TranscriptionInput,
  apiKey: string,
  send: typeof fetch,
): ProviderExchange<string> {
  return {
    model: TRANSCRIPTION_MODEL,
    reservation: transcriptionReservation,
    send: (signal) =>
      send(ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}` },
        redirect: 'error',
        body: form(input),
        signal,
      }),
    async read(reply) {
      if (rejectedBeforeWork(reply.status)) {
        void reply.body?.cancel().catch(() => {});
        return { billing: { status: 'released' } };
      }
      const result = await readReply(reply);
      if (!result) return { billing: { status: 'unknown' } };
      const { billing, withinLimit } = transcriptionCharge(result.usage);
      return { value: withinLimit ? acceptTranscript(result.text) : undefined, billing };
    },
  };
}

// Recognition is a proposal for the child to check, so the reply carries only
// text: an empty string when nothing was heard.
export function createTranscriptionGateway(
  settings: ProviderSettings,
  authorize: Authorize,
  meter: Meter,
  send = fetch,
) {
  const call = createMeteredCall(settings, authorize, meter);
  return (credentials: Credentials, input: TranscriptionInput, external?: AbortSignal) =>
    call(() => transcriptionExchange(input, settings.apiKey, send), credentials, external);
}

export type TranscriptionGateway = ReturnType<typeof createTranscriptionGateway>;
