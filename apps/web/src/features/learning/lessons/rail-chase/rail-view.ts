import { runs, type Part, type RailState } from './rail-story';
import { shots, type Shot } from './script';

// What a scene of the film puts on screen besides the tracks and the two
// cars, each only from the scene that needs it on:
// - `question`, the problem's question, kept from the scene that asks it;
// - `steps`, the stretch each car drives in a second, as the child taps it;
// - `speeds`, the speed beside each car while it stands near its start;
// - `sample`, how long four squares are, beside the question;
// - `drops`, the lines down from both midpoints to the squares between them;
// - `strip`, the start strip, `counting` while its squares first light up;
// - `legend`, what one gold square stands for, `supposed` in the variation;
// - `compare`, the two cars' first second side by side;
// - `ahead`, the arrow saying the yellow car is ahead;
// - `meet`, the ring where the two midpoints line up;
// - `ruler`, the label of four squares apart when the cars stop at a time;
// - `ways`, the two small pictures, and how many of them are tapped;
// - `next`, the part the child should touch next.
export type RailView = Readonly<{
  question: boolean;
  steps: readonly ('yellow' | 'blue')[];
  speeds: boolean;
  sample: boolean;
  drops: boolean;
  strip: boolean;
  counting: boolean;
  legend?: 'plain' | 'supposed';
  compare: boolean;
  ahead: boolean;
  meet: boolean;
  ruler: boolean;
  ways?: number;
  next?: Part;
}>;

// A state on one of the lesson's own scenes.
type OnScene = RailState & Readonly<{ shot: Shot }>;

const from = (shot: Shot, first: Shot) => shots.indexOf(shot) >= shots.indexOf(first);
const varying = (shot: Shot) => from(shot, 'vary');

// The parts the scenes without a run wait for, in order.
const waiting: Readonly<Partial<Record<Shot, readonly Part[]>>> = {
  speed: ['yellow-car', 'blue-car'],
  question: ['yellow-car', 'blue-car'],
  'start-gap': ['start-gap'],
  'name-t': ['rest'],
  equation: ['four'],
  'two-ways': ['blue-ahead', 'yellow-ahead'],
};

// The part the scene waits for: a car to push or tap while the cars stand
// where the scene begins, the squares between the midpoints once the cars
// have passed each other, or the next thing to tap.
function nextOf({ shot, taps, stopped, t }: OnScene): Part | undefined {
  const run = runs[shot];
  if (!run) return waiting[shot]?.[taps];
  if (shot === 'past' && stopped && taps === 0) return 'gap';
  return !stopped && t === run.from ? 'yellow-car' : undefined;
}

// The labels that come with the cars at the start: the stretch each drives
// in a second as the child taps it, their speeds, and four squares beside
// the question.
function introduced({ shot, taps, t }: OnScene) {
  return {
    steps: shot === 'speed' ? (['yellow', 'blue'] as const).slice(0, taps) : [],
    speeds: shot === 'question' || shot === 'start-gap' || (varying(shot) && t === 0),
    sample: shot === 'question' && taps === 2,
  };
}

// The start strip and what its gold squares stand for.
function counted({ shot, taps, stopped }: OnScene) {
  const shown = from(shot, 'one-second') || (shot === 'start-gap' && taps > 0);
  const legendShown = from(shot, 'two-seconds') || (shot === 'one-second' && stopped);
  return {
    drops: from(shot, 'start-gap'),
    strip: shown,
    counting: shot === 'start-gap' && taps > 0,
    legend: legendShown ? (varying(shot) ? 'supposed' : 'plain') : undefined,
  } as const;
}

// The arrow saying the yellow car is ahead: once the child has looked at
// the squares after the cars passed each other, on the next second, and
// when the check stops at the second time.
const yellowAhead = ({ shot, taps, stopped }: OnScene) =>
  (shot === 'past' && taps > 0) || shot === 'distance' || (shot === 'check-fourteen' && stopped);

// The ring where the two midpoints line up, from the stop that finds it
// until the cars move past it.
const lineUp = ({ shot, stopped, t }: OnScene) =>
  (shot === 'catch-up' && stopped) || (shot === 'past' && t === 10);

// The marks on the squares between the midpoints and beside the tracks.
function marked(scene: OnScene) {
  const { shot, taps, stopped } = scene;
  return {
    compare: shot === 'one-second' && stopped,
    ahead: yellowAhead(scene),
    meet: lineUp(scene),
    ruler: (shot === 'check-six' || shot === 'check-fourteen') && stopped,
    ways: shot === 'two-ways' ? taps : undefined,
  };
}

const opening: RailView = {
  question: false,
  steps: [],
  speeds: false,
  sample: false,
  drops: false,
  strip: false,
  counting: false,
  compare: false,
  ahead: false,
  meet: false,
  ruler: false,
};

// What a scene of the film shows. The title card and the opening story
// show only the tracks and the cars.
export function railView(state: RailState): RailView {
  const { shot } = state;
  if (shot === 'opening' || shot === 'story') return opening;
  const scene = { ...state, shot };
  return {
    question: from(shot, 'question'),
    ...introduced(scene),
    ...counted(scene),
    ...marked(scene),
    next: nextOf(scene),
  };
}
