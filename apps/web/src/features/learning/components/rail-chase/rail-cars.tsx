import { classNames } from '../../../../shared/lib/class-names';
import { carHeights, type Car } from '../../lessons/rail-chase/rail-track';
import styles from './rail-art.module.css';

// The workshop's paints: the yellow car's lacquer, the blue car's, glass and
// the wheels' rubber, and a soft shadow under each car.
export function RailDefs() {
  return (
    <defs>
      <linearGradient id="rail-yellow" x2="0" y2="1">
        <stop stopColor="#ffe9a8" />
        <stop offset=".5" stopColor="#f2b545" />
        <stop offset="1" stopColor="#b3701f" />
      </linearGradient>
      <linearGradient id="rail-blue" x2="0" y2="1">
        <stop stopColor="#c4f1f0" />
        <stop offset=".5" stopColor="#5fb0c0" />
        <stop offset="1" stopColor="#2b6274" />
      </linearGradient>
      <linearGradient id="rail-glass" x2="0" y2="1">
        <stop stopColor="#eaf8ff" />
        <stop offset="1" stopColor="#8fb9cc" />
      </linearGradient>
      <filter id="rail-shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#04121a" floodOpacity=".55" />
      </filter>
    </defs>
  );
}

function Wheel({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} -7)`}>
      <circle r="7" fill="#1d2a30" stroke="#0a1418" strokeWidth="1.5" />
      <circle r="2.6" fill="#d9c7a0" />
    </g>
  );
}

// The small yellow car, two squares long: a rounded cab with one window on
// a short body, and a headlight at the front.
function YellowCar({ length, lit }: { length: number; lit: boolean }) {
  const half = length / 2;
  return (
    <>
      <path
        d={`M${-half + 7} -24 Q${-half + 9} -40 ${-half + 19} -40 H${half - 17} Q${half - 9} -40 ${half - 5} -24 Z`}
        fill="url(#rail-yellow)"
        stroke="#5a3a10"
        strokeWidth="1.5"
      />
      <path
        d={`M${-half + 14} -25 Q${-half + 15} -35 ${-half + 21} -35 H${half - 18} Q${half - 13} -35 ${half - 10} -25 Z`}
        fill="url(#rail-glass)"
      />
      <rect
        x={-half}
        y={-27}
        width={length}
        height={18}
        rx={7}
        fill="url(#rail-yellow)"
        stroke="#5a3a10"
        strokeWidth="1.5"
      />
      <path
        d={`M${-half + 6} -21 H${half - 6}`}
        stroke="#fff5d0"
        strokeOpacity=".7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx={half - 3}
        cy={-18}
        r={3}
        className={classNames(styles.headlight, lit && styles.lit)}
      />
      <Wheel x={-half + 12} />
      <Wheel x={half - 12} />
    </>
  );
}

// The long blue car, six squares long: a low body under a row of windows,
// a driver's window at the front, a headlight and four wheels.
function BlueCar({ length, lit }: { length: number; lit: boolean }) {
  const half = length / 2;
  const panes = Array.from({ length: 5 }, (_, index) => -half + 14 + index * 26);
  return (
    <>
      <rect
        x={-half}
        y={-40}
        width={length}
        height={31}
        rx={10}
        fill="url(#rail-blue)"
        stroke="#123842"
        strokeWidth="1.5"
      />
      {panes.map((x) => (
        <rect key={x} x={x} y={-35} width={20} height={11} rx={3} fill="url(#rail-glass)" />
      ))}
      <path
        d={`M${half - 26} -35 H${half - 9} Q${half - 4} -35 ${half - 4} -29 V-24 H${half - 26} Z`}
        fill="url(#rail-glass)"
      />
      <path
        d={`M${-half + 6} -15 H${half - 6}`}
        stroke="#e9fbff"
        strokeOpacity=".55"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx={half - 3}
        cy={-15}
        r={3}
        className={classNames(styles.headlight, lit && styles.lit)}
      />
      {[-half + 16, -half + 40, half - 40, half - 16].map((x) => (
        <Wheel key={x} x={x} />
      ))}
    </>
  );
}

type CarProps = {
  car: Car;
  // Where the car's midpoint stands on the world, on its track.
  x: number;
  y: number;
  // How long the car is, in world units, and its midpoint's name.
  length: number;
  point: string;
  // The headlight flashes when the child taps the car on the title scene.
  lit?: boolean;
  // A car the child can push or tap is a button; `held` while it is pushed.
  label?: string;
  highlight?: boolean;
  held?: boolean;
};

// One of the two cars on its track, drawn facing right, with its midpoint
// marked and named just behind it. A car the child can push or tap carries
// its part, so the stage reports it, and a finger can hit the whole car.
export function RailCar({
  car,
  x,
  y,
  length,
  point,
  lit = false,
  label,
  highlight,
  held,
}: CarProps) {
  const { roof, middle } = carHeights[car];
  const Body = car === 'yellow' ? YellowCar : BlueCar;
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={classNames(label && styles.pushable, held && styles.held)}
      {...(label && {
        'data-part': `${car}-car`,
        'data-key': `${car}-car`,
        role: 'button',
        tabIndex: 0,
        'aria-label': label,
      })}
    >
      {label && (
        <rect
          x={-length / 2 - 12}
          y={-roof - 18}
          width={length + 24}
          height={roof + 30}
          fill="transparent"
        />
      )}
      {highlight && (
        <rect
          className={styles.halo}
          x={-length / 2 - 7}
          y={-roof - 6}
          width={length + 14}
          height={roof + 12}
          rx={12}
        />
      )}
      <g filter="url(#rail-shadow)">
        <Body length={length} lit={lit} />
      </g>
      <circle cy={-middle} r={5.5} className={styles.midpoint} />
      <text x={-length / 2 - 10} y={-middle + 7} className={styles.point}>
        {point}
      </text>
    </g>
  );
}
