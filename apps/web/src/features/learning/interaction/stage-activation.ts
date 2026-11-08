// What the child is holding: a prop picked up for a drag or chosen by tapping,
// and the place the drag is over.
export type Handling = Readonly<{ selected?: string; lifted?: string; over?: string }>;

// What the child tapped on the stage: a prop, by its kind and its own key, or a
// place props can be put.
export type Activation = Readonly<{ part?: string; key?: string; place?: string }>;

// A prop carried under the child's finger, drawn as it looks on the stage, at
// the stage coordinates of the pointer.
export type StageGhost<Look> = Look & Readonly<{ x: number; y: number }>;

// Stage props carry `data-part` and `data-key`, and the places they can be put
// carry `data-place`; a tap on anything inside one counts as a tap on it.
export function activationAt(target: EventTarget | null): Activation | undefined {
  if (!(target instanceof Element)) return;
  const part = target.closest<SVGElement>('[data-part]');
  if (part) return { part: part.dataset.part, key: part.dataset.key };
  const place = target.closest<SVGElement>('[data-place]');
  if (place) return { place: place.dataset.place };
}

// The place under a point of the screen, even where a prop lies on it.
export function placeAt(clientX: number, clientY: number) {
  return document.elementFromPoint(clientX, clientY)?.closest<SVGElement>('[data-place]')?.dataset
    .place;
}
