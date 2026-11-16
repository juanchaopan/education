// A refusal the reply explains to the family: its status, a message, for some
// refusals a reason the page chooses what to show by, and for a refusal to try
// again later how many seconds to wait when that differs from a minute.
export class RequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly reason?: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}
