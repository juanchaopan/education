// A task describes one kind of model call: how to build the bounded request and
// how to accept the model's text. The gateway owns consent, metering, timeouts
// and the provider protocol, so tasks stay free of them.
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
