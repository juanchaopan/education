// A refusal the reply explains to the family: its status, a message, and for
// some refusals a reason the page chooses what to show by.
export class RequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly reason?: string,
  ) {
    super(message);
  }
}
