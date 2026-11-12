import styles from './AttentionCue.module.css';

// A point on the stage's world.
export type Point = readonly [number, number];

// `shadow` is an SVG filter from the lesson's own paints, such as
// `url(#garden-shadow)`, so a cue sits in the scene like its props.
type CueProps =
  // A glowing arrow that travels from a prop to where it should go.
  | { kind: 'arrow'; from: Point; to: Point; shadow?: string }
  // A finger tapping a prop the child should touch.
  | { kind: 'finger'; at: Point; shadow?: string }
  // Rings spreading from a spot to look at.
  | { kind: 'pulse'; at: Point; radius?: number };

// The route is quoted with double quotes, the quote mark CSS serializes
// strings with, so the style reads back with the quote it was set with.
function Arrow({ from, to, shadow }: { from: Point; to: Point; shadow?: string }) {
  const [fromX, fromY] = from;
  const [toX, toY] = to;
  const path = `M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${Math.min(fromY, toY) - 35} ${toX} ${toY}`;
  return (
    <g className={styles.arrow} style={{ offsetPath: `path("${path}")` }}>
      <path d="M0-12L9 0L0 12L2 2L-13 3V-3L2-2Z" strokeWidth="2" filter={shadow} />
    </g>
  );
}

// The fingertip rests on the spot with the hand above it, leaning a little.
function Finger({ at: [x, y], shadow }: { at: Point; shadow?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-18)`}>
      <g className={styles.finger} filter={shadow}>
        <path d="M-10-82H24Q34-82 34-72V-50Q34-34 18-34H-4Q-14-34-14-44V-78Q-14-82-10-82Z" />
        <path d="M6-82V-66M20-80V-64" fill="none" strokeWidth="2" />
        <rect x="-8" y="-50" width="16" height="50" rx="8" strokeWidth="2" />
      </g>
    </g>
  );
}

function Pulse({ at: [x, y], radius = 40 }: { at: Point; radius?: number }) {
  return (
    <g className={styles.pulse} transform={`translate(${x} ${y})`}>
      <circle r={radius} />
      <circle r={radius} className={styles.later} />
    </g>
  );
}

// 「看这里」: a cue drawing the child's eye, in the stage's cue colours. It
// never takes a tap.
export function AttentionCue(cue: CueProps) {
  if (cue.kind === 'arrow') return <Arrow from={cue.from} to={cue.to} shadow={cue.shadow} />;
  if (cue.kind === 'finger') return <Finger at={cue.at} shadow={cue.shadow} />;
  return <Pulse at={cue.at} radius={cue.radius} />;
}
