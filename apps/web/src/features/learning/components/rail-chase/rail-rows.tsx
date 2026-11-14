import { classNames } from '../../../../shared/lib/class-names';
import { rows, starts, unit, xAt } from '../../lessons/rail-chase/rail-track';
import { Squares, Tappable } from './rail-parts';
import styles from './rail-art.module.css';

const strip = { from: starts.yellow, to: starts.blue };

type StripProps = {
  // Squares won back so far, gold from the left.
  won: number;
  // The squares light up in a quick sweep from M to N as the scene first
  // shows them, so the child takes in all ten at a glance.
  counting: boolean;
  // The squares still to win back are the next thing to tap.
  restToTap: boolean;
};

// The start strip: the ten squares between the two midpoints at the start,
// kept under the tracks all lesson. A square turns gold as the yellow car
// wins it back.
export function StartStrip({ won, counting, restToTap }: StripProps) {
  const y = rows.start;
  const squares = Array.from({ length: strip.to - strip.from }, (_, index) => (
    <rect
      key={index}
      x={xAt(strip.from + index) + 1.5}
      y={y - 10}
      width={unit - 3}
      height={20}
      rx={4}
      className={classNames(index < won ? styles.won : styles.square, counting && styles.counted)}
      style={counting ? { animationDelay: `${0.2 + index * 0.15}s` } : undefined}
    />
  ));
  const rest = (
    <rect
      x={xAt(strip.from + won) - 5}
      y={y - 15}
      width={(strip.to - strip.from - won) * unit + 10}
      height={30}
      rx={9}
      className={styles.target}
    />
  );
  return (
    <g>
      {squares}
      {restToTap && (
        <Tappable part="rest" label="起点的十格里还没变金的一段">
          {rest}
        </Tappable>
      )}
      <text x={xAt(strip.to) + 10} y={y + 6} className={classNames(styles.label, styles.start)}>
        起点的十格
      </text>
    </g>
  );
}

// Before the cars move: the stretch between the two lines dropped from the
// midpoints, which the child taps to count it.
export function StartGapToTap() {
  const y = rows.start;
  return (
    <Tappable part="start-gap" label="两条线中间的这一段">
      <rect
        x={xAt(strip.from)}
        y={y - 15}
        width={(strip.to - strip.from) * unit}
        height={30}
        rx={9}
        className={styles.target}
      />
    </Tappable>
  );
}

// What one gold square stands for: one second, or, in the variation, two
// gold squares a second, supposed.
export function Legend({ supposed }: { supposed: boolean }) {
  const x = 600;
  const y = rows.start;
  const per = supposed ? 2 : 1;
  const width = supposed ? 150 : 112;
  return (
    <g>
      <rect
        x={x}
        y={y - 13}
        width={width}
        height={26}
        rx={10}
        className={classNames(styles.glass, supposed && styles.supposed)}
      />
      {Array.from({ length: per }, (_, index) => (
        <rect
          key={index}
          x={x + 10 + index * 22}
          y={y - 7}
          width={19}
          height={14}
          rx={3}
          className={styles.won}
        />
      ))}
      <text x={x + 14 + per * 22} y={y + 6} className={classNames(styles.label, styles.start)}>
        {supposed ? '= 1 秒（假如）' : '= 1 秒'}
      </text>
    </g>
  );
}

type GapProps = {
  // Both midpoints, in squares, as the cars stand on screen.
  m: number;
  n: number;
  // The number of squares is written beside them when the cars stand on a
  // whole second, unless the ruler says they are four apart.
  count: boolean;
  ruler: boolean;
  // The arrow saying the yellow car is ahead, and the ring where the
  // midpoints line up.
  ahead: boolean;
  meet: boolean;
  // The squares are the next thing to tap.
  toTap: boolean;
};

// The squares between the two midpoints, the distance the problem asks
// about: teal while the blue car is ahead, clay once the yellow car is.
export function GapRow({ m, n, count, ruler, ahead, meet, toTap }: GapProps) {
  const y = rows.gap;
  const right = xAt(Math.max(m, n));
  const left = xAt(Math.min(m, n));
  const apart = Math.abs(n - m);
  const squares = (
    <Squares
      from={m}
      to={n}
      y={y}
      className={classNames(styles.gap, n < m && styles.ahead)}
      height={18}
    />
  );
  return (
    <g>
      {toTap ? (
        <Tappable part="gap" label="两个点之间的空隙">
          <rect
            x={left - 8}
            y={y - 15}
            width={right - left + 16}
            height={30}
            rx={9}
            className={styles.target}
          />
          {squares}
        </Tappable>
      ) : (
        squares
      )}
      {ahead && (
        <g>
          <path d={`M${xAt(n)} ${y + 16}H${xAt(m)} m-8 -6 l8 6 l-8 6`} className={styles.arrow} />
          <text
            x={(xAt(m) + xAt(n)) / 2}
            y={y + 36}
            className={classNames(styles.label, styles.warm)}
          >
            黄车在前
          </text>
        </g>
      )}
      {meet && <circle cx={xAt(m)} cy={y} r={13} className={styles.meet} />}
      {ruler ? (
        <g>
          <rect x={right + 8} y={y - 13} width={84} height={26} rx={10} className={styles.ruler} />
          <text x={right + 50} y={y + 6} className={styles.rulerText}>
            相距四格
          </text>
        </g>
      ) : (
        count &&
        apart > 0 && (
          <text
            x={right + 10}
            y={y + 6}
            className={classNames(styles.label, styles.cool, styles.start)}
          >
            {`${apart} 格`}
          </text>
        )
      )}
    </g>
  );
}

// The two ways four squares can lie between the midpoints, drawn away from
// the tracks so they show no time: the blue car ahead, and the yellow car
// ahead. The child taps them in turn; a tapped one is edged in gold.
export function Ways({ tapped, next }: { tapped: number; next?: 'blue-ahead' | 'yellow-ahead' }) {
  const y = 341;
  const card = (left: number, part: 'blue-ahead' | 'yellow-ahead', index: number) => {
    const blueAhead = part === 'blue-ahead';
    const title = blueAhead ? '蓝车在前 4 格' : '黄车在前 4 格';
    const art = (
      <g className={classNames(index < tapped && styles.picked)}>
        <rect x={left} y={y - 26} width={190} height={66} rx={14} className={styles.glass} />
        {next === part && (
          <rect x={left - 4} y={y - 30} width={198} height={74} rx={17} className={styles.halo} />
        )}
        <text x={left + 95} y={y - 6} className={styles.label}>
          {title}
        </text>
        <rect
          x={left + 12}
          y={y + 8}
          width={36}
          height={16}
          rx={4}
          className={blueAhead ? styles.yellowBlock : styles.blueBlock}
        />
        {Array.from({ length: 4 }, (_, square) => (
          <rect
            key={square}
            x={left + 54 + square * 21}
            y={y + 10}
            width={18}
            height={12}
            rx={3}
            className={classNames(styles.gap, !blueAhead && styles.ahead)}
          />
        ))}
        <rect
          x={left + 142}
          y={y + 8}
          width={36}
          height={16}
          rx={4}
          className={blueAhead ? styles.blueBlock : styles.yellowBlock}
        />
      </g>
    );
    return next === part ? (
      <Tappable key={part} part={part} label={title}>
        {art}
      </Tappable>
    ) : (
      <g key={part}>{art}</g>
    );
  };
  return (
    <g>
      {card(160, 'blue-ahead', 0)}
      {card(360, 'yellow-ahead', 1)}
    </g>
  );
}
