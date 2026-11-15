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

// Which way a deletion reaches: Backspace removes what stands before the
// caret, Delete what stands after it.
export type DeleteDirection = 'backward' | 'forward';

// The typed text without the character on the deletion's side of the caret,
// and where the caret then stands.
function withoutNeighbour(typed: string, caret: number, direction: DeleteDirection) {
  if (direction === 'forward')
    return { text: typed.slice(0, caret) + typed.slice(caret + 1), caret };
  return { text: typed.slice(0, caret - 1) + typed.slice(caret), caret: caret - 1 };
}

// One edit of the KEY field: what the field held, what it holds after the
// edit and where the caret stands in it. The result is the grouped KEY and
// the caret's place in it, after the same characters as before, so an edit
// in the middle keeps the caret there. Deleting a dash, which grouping would
// put straight back, deletes the KEY character beside it instead: the one
// before the dash for Backspace, the one after it for Delete.
export function editRegistrationKey(
  previous: string,
  typed: string,
  caret: number,
  direction: DeleteDirection = 'backward',
) {
  const dashDeleted = typed.length < previous.length && groupRegistrationKey(typed) === previous;
  const edit = dashDeleted ? withoutNeighbour(typed, caret, direction) : { text: typed, caret };
  return {
    value: groupRegistrationKey(edit.text),
    caret: groupRegistrationKey(edit.text.slice(0, edit.caret)).length,
  };
}
