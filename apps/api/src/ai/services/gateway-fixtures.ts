import { vi } from 'vitest';
import type { Admission, Authorize, Meter } from './metered-call.js';
import { createTutoringGateway } from './tutoring-gateway.js';

export const settings = { paidAiEnabled: true, eligible: true, apiKey: 'synthetic-key' };
export const credentials = { token: 'synthetic-session' };
export const encoder = new TextEncoder();
// The smallest upload that passes the WebM container check.
export const webmRecording = Buffer.concat([
  Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
  Buffer.alloc(96),
]);

export function event(data: object) {
  return 'data: ' + JSON.stringify(data) + '\r\n\r\n';
}

export function completion(text: string, usage = { input_tokens: 82, output_tokens: 12 }) {
  return event({
    type: 'response.completed',
    response: {
      status: 'completed',
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }],
      usage,
    },
  });
}

export function stream(...chunks: Uint8Array[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  );
}

// A provider, consent and ledger that admit every request and record each call.
export function meteredMocks() {
  const send = vi.fn<typeof fetch>();
  const authorize = vi.fn<Authorize>(async (_, start) => start(new AbortController().signal));
  const confirm = vi.fn<Admission['confirm']>().mockResolvedValue();
  const meter = {
    reserve: vi.fn<Meter['reserve']>().mockResolvedValue('id'),
    settle: vi.fn<Meter['settle']>().mockResolvedValue(),
  };
  const admission: Admission = { dispatch: authorize, confirm };
  return { send, authorize, confirm, admission, meter };
}

export function setupGateway(config = settings) {
  const mocks = meteredMocks();
  return {
    ...mocks,
    gateway: createTutoringGateway(config, mocks.admission, mocks.meter, mocks.send),
  };
}
