// A task describes one kind of model call: how to build the bounded request and
// how to accept the model's text. The gateway owns consent, metering, timeouts
// and the provider protocol, so tasks stay free of them.
export type ModelRequest = { instructions: string; content: string };

export type ModelTask<Input, Output> = {
  maxOutputTokens: number;
  request(input: Input): ModelRequest | undefined;
  accept(text: string): Output | undefined;
};
