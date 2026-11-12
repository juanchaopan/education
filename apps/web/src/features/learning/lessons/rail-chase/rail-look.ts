import type { Box, StagePalette } from '../../components/lesson-stage/stage-look';
import type { StageProps } from '../../interaction/useStageDrag';
import type { TeacherRole } from '../lesson-definition';
import type { Move, Part, RailState } from './rail-story';
import { speedOf, unit, type Car } from './rail-track';

// The owl stands at the left edge of the workbench, clear of the tracks.
export const railTeacher: TeacherRole = {
  id: 'owl',
  place: { x: 2, y: 352, width: 122, height: 182 },
  ground: { cx: 63, cy: 530, rx: 48, ry: 9 },
};

// The question and the derivation board along the top, the two tracks with
// the cars' whole run, the squares under them and the start strip, inside
// the clearing of railway-workshop-dusk and above the subtitle's row.
export const railStaging: Box = { x: 140, y: 265, width: 860, height: 285 };

// The blue-hour colours of the railway workshop, with its lamplit gold.
export const railPalette: StagePalette = {
  sky: 'radial-gradient(ellipse at 50% 30%, #3f6f78, #173b45 62%, #0b1d24)',
  text: '#fff6e4',
  accent: '#ffd88f',
  title: '#ffefc8',
  titleShade: '#0a1a20',
  titleEdge: '#102830',
  sunlight: '#ffcf8a4f',
  shadeLow: '#0b1c22c8',
  shadeHigh: '#2a1a3a3d',
  button: '#1e4a54ec',
  buttonHover: '#2c6a75',
  buttonEdge: '#ffd892',
  buttonShadow: '#0b1f2670',
  teacherShadow: '#0a1c2266',
  teacherGround: '#14262c',
  halo: '#ffe2a4',
  haloStrong: '#fff4c8',
  glow: '#ffeeb0',
  ghostShadow: '#08181e91',
  cue: '#fff0b8',
  cueEdge: '#8a6526',
  ambience: '#ffe7b0',
  boardInk: '#fff1d6',
};

const parts: readonly Part[] = [
  'yellow-car',
  'blue-car',
  'start-gap',
  'rest',
  'gap',
  'four',
  'blue-ahead',
  'yellow-ahead',
];
const isPart = (part: string): part is Part => (parts as readonly string[]).includes(part);

// A car is pushed along its track: dragged by some world units, the cars
// drive on as many seconds as it takes that car to cover them; an arrow key
// drives them a second on or back.
function pushed(car: Car) {
  return {
    drag: (by: number, held: RailState): Move => ({
      kind: 'drive',
      to: held.t + by / (unit * speedOf(car, held.shot)),
    }),
    nudge: (nudge: 1 | -1): Move => ({ kind: 'nudge', nudge }),
  };
}

// Nothing is carried in this lesson: the cars are pushed, everything else
// is tapped.
export const railProps: StageProps<Move, Readonly<Record<never, object>>, RailState> = {
  lifts: {},
  drop: () => undefined,
  tap: (part) => (isPart(part) ? { kind: 'tap', part } : undefined),
  slides: { 'yellow-car': pushed('yellow'), 'blue-car': pushed('blue') },
};
