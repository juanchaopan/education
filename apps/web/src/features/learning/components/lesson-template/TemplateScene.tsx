import type { Handling } from '../../interaction/stage-activation';
import type { SceneProps } from '../../lessons/lesson-definition';
import { pebbleLook, pebbles, type TemplateState } from '../../lessons/lesson-template/story';
import { AttentionCue, type Point } from '../lesson-stage/AttentionCue';
import { Prop, PropPlace } from '../lesson-stage/Prop';

// The template lesson's own picture, drawn on the shared stage's 1200×675
// world: two pebbles on the table and a bowl to put them in. It draws only
// the lesson's things; the stage lays in the backdrop, the teacher and every
// control.

const bowl: Point = [720, 400];
const tableSpots: readonly Point[] = [
  [470, 410],
  [560, 400],
];
const bowlSpots: readonly Point[] = [
  [702, 392],
  [740, 396],
];
const inBowlSize = pebbleLook.size * 0.7;
const nextPebble = 'pebble-next';

// A pebble as it looks on the table and under the child's finger.
export function Pebble({ size }: { size: number }) {
  const r = size / 2;
  return (
    <g>
      <ellipse rx={r} ry={r * 0.72} fill="#8d8f86" />
      <ellipse rx={r * 0.55} ry={r * 0.32} cx={-r * 0.2} cy={-r * 0.2} fill="#b7b9ae" />
    </g>
  );
}

function Bowl({ highlight, over }: { highlight: boolean; over: boolean }) {
  const [x, y] = bowl;
  return (
    <PropPlace
      place="bowl"
      label="碗"
      x={x}
      y={y}
      highlight={highlight}
      over={over}
      halo={{ rx: 86, ry: 44 }}
    >
      <path d="M-74 -10Q0 70 74 -10Z" fill="#c6824b" />
      <ellipse rx={74} ry={16} cy={-10} fill="#e0a56b" />
    </PropPlace>
  );
}

// A pebble that only sits where it is, on the table or in the bowl.
function RestingPebble({ at: [x, y], size }: { at: Point; size: number }) {
  return (
    <Prop x={x} y={y} size={size}>
      <Pebble size={size} />
    </Prop>
  );
}

// The one pebble the child moves next: a single prop to pick up, so the move
// the bowl reports is always the pebble the scene takes off the table.
function NextPebble({ at: [x, y], handling }: { at: Point; handling: Handling }) {
  return (
    <Prop
      x={x}
      y={y}
      size={pebbleLook.size}
      part="pebble"
      id={nextPebble}
      label="小石子"
      highlight
      selected={handling.selected === nextPebble}
      lifted={handling.lifted === nextPebble}
    >
      <Pebble size={pebbleLook.size} />
    </Prop>
  );
}

export function TemplateScene({ state, handling }: SceneProps<TemplateState>) {
  const { shot, inBowl } = state;
  if (shot === 'opening') return null;
  const onTable = tableSpots.slice(0, pebbles - inBowl);
  const next = shot === 'look' ? onTable.at(-1) : undefined;
  const resting = next ? onTable.slice(0, -1) : onTable;
  return (
    <g>
      <Bowl highlight={!!next} over={handling.over === 'bowl'} />
      {bowlSpots.slice(0, inBowl).map((spot) => (
        <RestingPebble key={`bowl-${spot[0]}`} at={spot} size={inBowlSize} />
      ))}
      {resting.map((spot) => (
        <RestingPebble key={`table-${spot[0]}`} at={spot} size={pebbleLook.size} />
      ))}
      {next && <NextPebble at={next} handling={handling} />}
      {next && <AttentionCue kind="arrow" from={next} to={bowl} />}
    </g>
  );
}
