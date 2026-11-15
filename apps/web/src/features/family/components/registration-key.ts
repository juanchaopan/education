const keyCharacters = 16;
const groupSize = 4;

// A registration KEY as a child types or pastes it, written the way the
// parent's page shows it: capital letters and digits only, at most sixteen,
// in groups of four joined by short dashes. Spaces, dashes and anything else
// typed between them are dropped, so a KEY pasted in any form reads the same.
export function groupRegistrationKey(typed: string) {
  const characters = typed
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, keyCharacters);
  return characters.match(new RegExp(`.{1,${groupSize}}`, 'g'))?.join('-') ?? '';
}
