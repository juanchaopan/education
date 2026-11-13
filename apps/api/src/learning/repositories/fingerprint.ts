import { createHmac } from 'node:crypto';
import type { SubmitAnswer } from '@education/contracts';

// An answer's input with an object's keys in a fixed order, so the same
// answer sent with its keys in another order has the same fingerprint.
export function orderedInput(input: SubmitAnswer['input']) {
  if (typeof input !== 'object' || Array.isArray(input)) return input;
  return Object.fromEntries(
    Object.keys(input)
      .sort()
      .map((key) => [key, input[key]]),
  );
}

// A keyed digest of what a request carried, which tells a retry of the same
// request from a different one reusing its id without keeping the content.
export function fingerprint(secret: string, parts: readonly unknown[]) {
  return createHmac('sha256', secret).update(JSON.stringify(parts)).digest('hex');
}
