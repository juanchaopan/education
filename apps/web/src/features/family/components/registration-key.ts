// A registration KEY as a child types or pastes it, written the way the
// parent's page shows it: capital letters and digits only, at most sixteen,
// in groups of four joined by short dashes. Spaces, dashes and anything else
// typed between them are dropped, so a KEY pasted in any form reads the same.
export function groupRegistrationKey(typed: string) {
  return typed
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 16)
    .replace(/(.{4})(?=.)/g, '$1-');
}

// One edit of the KEY field: what the field held, what it holds after the
// edit and where the caret stands in it. The result is the grouped KEY and
// the caret's place in it, after the same characters as before, so an edit
// in the middle keeps the caret there. Deleting a dash, which grouping would
// put straight back, deletes the character before it instead.
export function editRegistrationKey(previous: string, typed: string, caret: number) {
  const dashDeleted = typed.length < previous.length && groupRegistrationKey(typed) === previous;
  const edited = dashDeleted ? typed.slice(0, caret - 1) + typed.slice(caret) : typed;
  const at = dashDeleted ? caret - 1 : caret;
  return {
    value: groupRegistrationKey(edited),
    caret: groupRegistrationKey(edited.slice(0, at)).length,
  };
}
