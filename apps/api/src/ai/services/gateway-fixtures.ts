import type { vi } from 'vitest';
import { createTutoringGateway } from './tutoring-gateway.js';

// Shared by gateway tests. The mock factory is passed in so this module never
// imports the test runner at run time.
export const settings = { paidAiEnabled: true, eligible: true, apiKey: 'synthetic-key' };
export const credentials = { token: 'synthetic-session' };
export const encoder = new TextEncoder();

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

export function setupGateway(mock: typeof vi.fn, config = settings) {
  const send = mock<typeof fetch>();
  const authorize = mock<Parameters<typeof createTutoringGateway>[1]>(async (_, start) =>
    start(new AbortController().signal),
  );
  const meter = {
    reserve: mock<Parameters<typeof createTutoringGateway>[2]['reserve']>().mockResolvedValue('id'),
    settle: mock<Parameters<typeof createTutoringGateway>[2]['settle']>().mockResolvedValue(),
  };
  return { send, authorize, meter, gateway: createTutoringGateway(config, authorize, meter, send) };
}
