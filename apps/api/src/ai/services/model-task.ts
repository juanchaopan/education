import type { AiHelpFallback } from '@education/contracts';
import type { Credentials } from './metered-call.js';

// A task describes one kind of Responses call: how to build the bounded request
// and how to accept the model's text. The metered call owns consent, metering,
// timeouts and cancellation, and the tutoring gateway owns the provider
// protocol, so tasks stay free of them.
export type ContentPart =
  { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'low' };

export type ModelRequest = {
  instructions: string;
  content: string | ContentPart[];
  // A strict JSON schema for the reply, for tasks that expect structured output.
  format?: { name: string; schema: Record<string, unknown> };
};

export type ModelTask<Input, Output> = {
  maxOutputTokens: number;
  request(input: Input): ModelRequest | undefined;
  accept(text: string): Output | undefined;
};

// The longest step description an author may give a model.
export const MAX_STEP_PROMPT_LENGTH = 1_200;

// How a task's call for a child ends: the reply the task accepted, or why the
// child is guided on without one.
export type ModelReply<Output> =
  { status: 'ready'; value: Output } | { status: 'fallback'; reason: AiHelpFallback };

export type AskModel<Input, Output> = (
  credentials: Credentials,
  input: Input,
  signal?: AbortSignal,
) => Promise<ModelReply<Output>>;
