import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { Prop, PropPlace } from '../lesson-stage/Prop';
import styles from './garden-art.module.css';

export type Sprite = 'garden-apple' | 'garden-cabbage' | 'garden-cucumber';
export type PartKind = 'leaf' | 'apple' | 'exchange' | 'replace';

const delayed = (seconds: number) => ({ '--delay': `${seconds}s` }) as CSSProperties;

export function SpriteUse({ sprite, size }: { sprite: Sprite; size: number }) {
  return (
    <use
      href={`#${sprite}`}
      x={-size / 2}
      y={-size / 2}
      width={size}
      height={size}
      filter="url(#garden-shadow)"
    />
  );
}

// A cabbage, an apple or a cucumber on the stage, drawn from the garden's
// symbols; with a kind, the child can move it.
export type PartProps = Omit<ComponentProps<typeof Prop>, 'part' | 'children'> & {
  sprite: Sprite;
  part?: PartKind;
};

export function Part({ sprite, ...prop }: PartProps) {
  return (
    <Prop {...prop}>
      <SpriteUse sprite={sprite} size={prop.size} />
    </Prop>
  );
}

// A glowing arrow that travels from the prop to where it should go.
export function Spark({ from, to }: { from: [number, number]; to: [number, number] }) {
  const [fromX, fromY] = from;
  const [toX, toY] = to;
  const path = `M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${Math.min(fromY, toY) - 35} ${toX} ${toY}`;
  return (
    <g className={styles.hintSpark} style={{ offsetPath: `path('${path}')` }}>
      <path
        d="M0-12L9 0L0 12L2 2L-13 3V-3L2-2Z"
        fill="#fff3bc"
        stroke="#8b662b"
        strokeWidth="2"
        filter="url(#garden-shadow)"
      />
    </g>
  );
}

const fireflies = Array.from({ length: 18 }, (_, i) => ({
  x: 80 + ((i * 73) % 1050),
  y: 105 + ((i * 59) % 390),
  r: 1.4 + (i % 3),
  delay: -i * 0.57,
}));

export function Fireflies() {
  return (
    <g className={styles.petals}>
      {fireflies.map(({ x, y, r, delay }) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#ffeeb7" style={delayed(delay)} />
      ))}
    </g>
  );
}

const beam = { pivot: 650, left: 483, right: 817, y: 321 };

function Pan({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g className={styles.pan} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <path
        d="M-93 6Q-76 45 0 48Q74 46 93 6Z"
        fill="url(#garden-turq)"
        stroke="#244b3e"
        strokeWidth="3"
        filter="url(#garden-shadow)"
      />
      <ellipse cy="6" rx="94" ry="17" fill="#417f72" stroke="#dbad64" strokeWidth="7" />
      <ellipse cy="3" rx="83" ry="10" fill="#5b9785" opacity=".67" />
      {children}
    </g>
  );
}

function Stand() {
  return (
    <>
      <ellipse cx="652" cy="460" rx="144" ry="18" fill="#3c261b" opacity=".25" />
      <path
        d="M555 447Q650 426 745 447L740 465H562Z"
        fill="url(#garden-wood)"
        stroke="#704221"
        strokeWidth="2"
        filter="url(#garden-shadow)"
      />
      <path
        d="M601 448Q630 425 632 354L638 314H662L669 354Q670 426 698 448Z"
        fill="url(#garden-turq)"
        stroke="#315448"
        strokeWidth="3"
      />
      <circle cx="650" cy="411" r="16" fill="#ac853d" stroke="#f6d287" strokeWidth="3" />
    </>
  );
}

// The balance: a stand, a beam and two pans. `tilt` lowers the right pan and
// raises the left one by the same amount.
export function Scale({ left, right, tilt }: { left: ReactNode; right: ReactNode; tilt: number }) {
  const ly = beam.y - tilt;
  const ry = beam.y + tilt;
  return (
    <>
      <Stand />
      <path
        d={`M${beam.left} ${ly + 20} L${beam.right} ${ry + 20}`}
        stroke="#704926"
        strokeWidth="21"
        strokeLinecap="round"
      />
      <path
        d={`M${beam.left} ${ly + 16} L${beam.right} ${ry + 16}`}
        stroke="url(#garden-gold)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle
        cx={beam.pivot}
        cy={beam.y + 17}
        r="14"
        fill="#d49e48"
        stroke="#ffe5a0"
        strokeWidth="3"
      />
      <Pan x={beam.left} y={ly}>
        {left}
      </Pan>
      <Pan x={beam.right} y={ry}>
        {right}
      </Pan>
    </>
  );
}

const basketGround = (
  <>
    <ellipse rx="72" ry="20" cy="37" fill="#53341d" opacity=".23" />
    <rect x="-81" y="-67" width="162" height="133" rx="40" fill="transparent" />
  </>
);

// The basket beside the scale, where the child puts what leaves it.
export function Basket({ highlight, over }: { highlight: boolean; over: boolean }) {
  return (
    <PropPlace
      place="basket"
      label="旁边的篮子"
      x={984}
      y={416}
      highlight={highlight}
      over={over}
      halo={{ rx: 69, ry: 42, cy: -10 }}
      ground={basketGround}
    >
      <use
        href="#garden-basket"
        x="-78"
        y="-63"
        width="156"
        height="126"
        filter="url(#garden-shadow)"
      />
    </PropPlace>
  );
}

type BoardTextProps = { x: number; y: number; size?: number; children: string };

export function BoardText({ x, y, size = 21, children }: BoardTextProps) {
  return (
    <text x={x} y={y} textAnchor="middle" fill="#654024" fontWeight="850" fontSize={size}>
      {children}
    </text>
  );
}
