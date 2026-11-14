// What the child is holding: a prop picked up for a drag, chosen by tapping or
// pushed along the stage, and the place a drag is over.
export type Handling = Readonly<{ selected?: string; lifted?: string; over?: string }>;

// One press of an arrow key on a prop: a step to the right, or to the left.
export type Nudge = 1 | -1;

// What the child tapped on the stage: a prop, by its kind and its own key, or a
// place props can be put; or the prop an arrow key nudged, and which way.
export type Activation = Readonly<{ part?: string; key?: string; place?: string; nudge?: Nudge }>;

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

const nudges: Readonly<Record<string, Nudge>> = { ArrowRight: 1, ArrowLeft: -1 };

// The prop an arrow key nudges, and which way: the right arrow pushes it on,
// the left one back. Keys that nudge nothing, or a press beside the props,
// give nothing.
export function nudgeAt(target: EventTarget | null, key: string): Activation | undefined {
  const nudge = nudges[key];
  const prop = nudge === undefined ? undefined : activationAt(target);
  return prop?.part === undefined ? undefined : { ...prop, nudge };
}

// The place under a point of the screen, even where a prop lies on it.
export function placeAt(clientX: number, clientY: number) {
  return document.elementFromPoint(clientX, clientY)?.closest<SVGElement>('[data-place]')?.dataset
    .place;
}
