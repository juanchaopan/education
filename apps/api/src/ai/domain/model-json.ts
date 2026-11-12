import type { Static, TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

// A model's structured reply is untrusted: it is used only when it is JSON of
// exactly the shape the task asked for.
export function parseModelJson<S extends TSchema>(schema: S, text: string): Static<S> | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return;
  }
  return Value.Check(schema, value) ? value : undefined;
}
