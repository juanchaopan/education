import type { CSSProperties } from 'react';

// The colours a lesson's stage is painted in, taken from its backdrop. Each one
// becomes a `--stage-<name>` custom property on the stage, so every part drawn
// on it shares the lesson's palette while the site's tokens keep the spacing.
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
  titleBar: string;
  titleBarShade: string;
  titleBarDot: string;
  replay: string;
  replayEdge: string;
  replayPlaying: string;
  // The ring that calls for a tap on a line waiting to be heard again.
  replayCall: string;
  caption: string;
  captionEdge: string;
  captionShadow: string;
  captionText: string;
  speaker: string;
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

// How the backdrop is framed in a scene: its zoom, and how far it moves across
// and down, as a share of its own size.
export type Camera = Readonly<{ zoom: number; x?: number; y?: number }>;

// The painted picture behind the props and the part of it kept in view.
export type Backdrop = Readonly<{ image: string; focus: string }>;

type Box = Readonly<{ x: number; y: number; width: number; height: number }>;
type Ellipse = Readonly<{ cx: number; cy: number; rx: number; ry: number }>;

// The character who tells the lesson: where it stands in the stage's world and
// the shadow at its feet.
export type Teacher = Readonly<{ name: string; image: string; place: Box; ground: Ellipse }>;

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
  palette: StagePalette;
}>;

const propertyName = (name: string) =>
  `--stage-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

export function paletteStyle(palette: StagePalette) {
  return Object.fromEntries(
    Object.entries(palette).map(([name, value]) => [propertyName(name), value]),
  ) as CSSProperties;
}
