// Names for steps, hints and observations: lowercase words joined by hyphens.
export const identifierPattern = /^[a-z][a-z0-9-]{0,63}$/;

// Standard base64 with padding, as browsers' btoa produces it.
export const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

// Four base64 characters carry three bytes.
export function base64Length(bytes: number) {
  return Math.ceil(bytes / 3) * 4;
}
