// The longest hint a child is sent, as the hint receipt allows.
const hintMaxLength = 2000;

// The text of one of a problem's authored hints, or undefined when the problem
// has no such hint or its text is too long to send. Only the problem's own
// keys count, so a name such as `constructor` never finds anything.
export function authoredHint(hints: Readonly<Record<string, string>> | undefined, id: string) {
  const text = hints && Object.hasOwn(hints, id) ? hints[id] : undefined;
  return text && text.length <= hintMaxLength ? text : undefined;
}
