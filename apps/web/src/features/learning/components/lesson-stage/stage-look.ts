import type { CSSProperties } from 'react';

// The colours a lesson's stage is painted in, taken from its backdrop. Each one
// becomes a `--stage-<name>` custom property on the stage, so every part drawn
// on it shares the lesson's palette while the site's tokens keep the spacing.
// The controls laid into the picture are the same glass on every lesson, so
// they take their colours from the site's dew tokens instead.
export type StagePalette = Readonly<{
  // Behind the backdrop while its picture loads.
  sky: string;
  text: string;
  // The title card's small line, the start button's mark and focus outlines.
  accent: string;
  title: string;
  titleShade: string;
  titleEdge: string;
  // The sunlight over the backdrop, and the shade at its bottom and top edges.
  sunlight: string;
  shadeLow: string;
  shadeHigh: string;
  button: string;
  buttonHover: string;
  buttonEdge: string;
  buttonShadow: string;
  teacherShadow: string;
  teacherGround: string;
  // The outline round the prop or place that moves next, and its brighter
  // state while it is pointed at, chosen or reached by the keyboard.
  halo: string;
  haloStrong: string;
  glow: string;
  // The shadow under a prop the child is dragging.
  ghostShadow: string;
  // The cues that draw the child's eye, and their outline.
  cue: string;
  cueEdge: string;
  // What drifts over the scenes: fireflies, petals.
  ambience: string;
  // Writing on boards and labels.
  boardInk: string;
}>;

// A rectangle and an ellipse in the stage's world.
export type Box = Readonly<{ x: number; y: number; width: number; height: number }>;
export type Ellipse = Readonly<{ cx: number; cy: number; rx: number; ry: number }>;

// Every lesson draws on the same 1200×675 world, and a backdrop is laid over
// the whole of it.
export const world: Box = { x: 0, y: 0, width: 1200, height: 675 };

// Whether a box lies wholly inside another.
export function inside(box: Box, frame: Box) {
  return (
    box.x >= frame.x &&
    box.y >= frame.y &&
    box.x + box.width <= frame.x + frame.width &&
    box.y + box.height <= frame.y + frame.height
  );
}

// How the backdrop is framed in a scene: its zoom about the middle of the
// world, and how far it moves across and down first, as a share of the
// world's size. The props stay where they are.
export type Camera = Readonly<{ zoom: number; x?: number; y?: number }>;

// The framing of every scene that has none of its own. It overscans a
// little, so the backdrop's edges never show while it settles in or glides
// to the next scene.
export const establishing: Camera = { zoom: 1.035 };

// Where a box drawn on the backdrop shows in the world once the backdrop is
// framed by a camera.
export function framed(box: Box, { zoom, x = 0, y = 0 }: Camera): Box {
  const middleX = world.x + world.width / 2;
  const middleY = world.y + world.height / 2;
  return {
    x: middleX + zoom * (box.x - middleX + (x / 100) * world.width),
    y: middleY + zoom * (box.y - middleY + (y / 100) * world.height),
    width: zoom * box.width,
    height: zoom * box.height,
  };
}

// The painted picture behind the props and the part of it kept in view.
export type Backdrop = Readonly<{ image: string; focus: string }>;

// The square round a character's face in its picture, for a round portrait:
// its left and top edges and its side, each as a share of the picture's width.
export type Face = Readonly<{ x: number; y: number; size: number }>;

// The character who tells the lesson: where it stands in the stage's world,
// the shadow at its feet, and where its face is in its picture.
export type Teacher = Readonly<{
  name: string;
  image: string;
  place: Box;
  ground: Ellipse;
  face: Face;
}>;

// Everything about a lesson's stage that stays the same while it plays.
export type StageLook = Readonly<{
  // The names a screen reader gives the film and the props inside it.
  label: string;
  worldLabel: string;
  title: string;
  // The lesson's series, for example 菜园小剧场.
  theater: string;
  backdrop: Backdrop;
  // The framing of the scenes that do not keep the establishing one.
  cameras?: Readonly<Partial<Record<string, Camera>>>;
  teacher: Teacher;
  // The part of the world the lesson's props take up in every scene, which
  // an upright frame fits to its width.
  staging: Box;
  palette: StagePalette;
}>;

const propertyName = (name: string) =>
  `--stage-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

export function paletteStyle(palette: StagePalette) {
  return Object.fromEntries(
    Object.entries(palette).map(([name, value]) => [propertyName(name), value]),
  ) as CSSProperties;
}

// The props' part of the world as `--staging-*` numbers, which the stage's
// layout reads.
export function stagingStyle({ x, y, width, height }: Box) {
  return {
    '--staging-x': x,
    '--staging-y': y,
    '--staging-width': width,
    '--staging-height': height,
  } as CSSProperties;
}

// Starts a stage part's animation `seconds` late, through its `--delay`; a
// negative delay starts it part of the way through.
export const delayStyle = (seconds: number) => ({ '--delay': `${seconds}s` }) as CSSProperties;
