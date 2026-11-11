// HTML tags and entities, markdown, links and control characters never belong in a sentence
// shown to a child. Comparison signs in maths replies are ordinary text.
const unsafeText = /<[a-zA-Z/!?]|&#?\w+;|`|\]\(|:\/\/|www\.|[\p{Cc}\p{Cf}]/u;

// Whether a teacher's sentence may be shown to a child as it is: plain text,
// not padded, and no longer than the reply it is shown in allows.
export function isChildSentence(value: string, maxLength: number) {
  return (
    value.trim() === value &&
    value.length > 0 &&
    value.length <= maxLength &&
    !unsafeText.test(value)
  );
}
