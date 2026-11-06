import { vi } from 'vitest';
import { createTutoringGateway } from './tutoring-gateway.js';

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

export function setupGateway(config = settings) {
  const send = vi.fn<typeof fetch>();
  const authorize = vi.fn<Parameters<typeof createTutoringGateway>[1]>(async (_, start) =>
    start(new AbortController().signal),
  );
  const meter = {
    reserve: vi
      .fn<Parameters<typeof createTutoringGateway>[2]['reserve']>()
      .mockResolvedValue('id'),
    settle: vi.fn<Parameters<typeof createTutoringGateway>[2]['settle']>().mockResolvedValue(),
  };
  return { send, authorize, meter, gateway: createTutoringGateway(config, authorize, meter, send) };
}
