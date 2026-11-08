import type { CSSProperties } from 'react';
import styles from './Ambience.module.css';

const delayed = (seconds: number) => ({ '--delay': `${seconds}s` }) as CSSProperties;

// Spread over the stage's world without clumping: each step moves a fixed,
// unrelated distance across and down, wrapping at the edges.
const fireflies = Array.from({ length: 18 }, (_, i) => ({
  x: 80 + ((i * 73) % 1050),
  y: 105 + ((i * 59) % 390),
  r: 1.4 + (i % 3),
  delay: -i * 0.57,
}));

const petals = Array.from({ length: 14 }, (_, i) => ({
  x: 60 + ((i * 89) % 1080),
  y: 40 + ((i * 67) % 360),
  turn: (i * 47) % 180,
  delay: -i * 0.83,
}));

function Fireflies() {
  return (
    <g className={styles.fireflies}>
      {fireflies.map(({ x, y, r, delay }) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={delayed(delay)} />
      ))}
    </g>
  );
}

function Petals() {
  return (
    <g className={styles.petals}>
      {petals.map(({ x, y, turn, delay }) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${turn})`}>
          <ellipse rx="7" ry="3.6" style={delayed(delay)} />
        </g>
      ))}
    </g>
  );
}

// What drifts over a lesson's scenes, in the stage's ambience colour: fireflies
// glowing in a garden evening, or petals falling. It never takes a tap, and
// holds still for a child who asks for less motion.
export function Ambience({ kind }: { kind: 'fireflies' | 'petals' }) {
  return kind === 'fireflies' ? <Fireflies /> : <Petals />;
}
