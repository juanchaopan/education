// The character drawn for a name on a disc: its first one, upper-cased, or a
// question mark for a blank name.
export const initialOf = (name: string) => (Array.from(name.trim())[0] ?? '?').toUpperCase();
