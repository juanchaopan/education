import type { ReactNode } from 'react';
import { classNames } from '../../../../shared/lib/class-names';
import { rows, unit, xAt } from '../../lessons/rail-chase/rail-track';
import styles from './rail-art.module.css';

type SquaresProps = {
  // The squares from one point to another, in squares of the problem; a
  // part of a square at the end is drawn as far as it reaches.
  from: number;
  to: number;
  y: number;
  className: string;
  height?: number;
};

// A row of squares laid along the track between two points.
export function Squares({ from, to, y, className, height = 20 }: SquaresProps) {
  const low = Math.min(from, to);
  const length = Math.abs(to - from);
  return Array.from({ length: Math.ceil(length - 1e-9) }, (_, index) => {
    const width = unit * Math.min(1, length - index) - 3;
    return (
      <rect
        key={index}
        x={xAt(low + index) + 1.5}
        y={y - height / 2}
        width={Math.max(0, width)}
        height={height}
        rx={4}
        className={className}
      />
    );
  });
}

type TapProps = {
  part: string;
  label: string;
  children: ReactNode;
};

// Something on the stage the child taps, which the stage reports by its part.
export function Tappable({ part, label, children }: TapProps) {
  return (
    <g
      className={styles.tappable}
      data-part={part}
      data-key={part}
      role="button"
      tabIndex={0}
      aria-label={label}
    >
      {children}
    </g>
  );
}

// A small piece of glass with a label on it, centred on its point.
export function Tag({
  x,
  y,
  width,
  children,
  tone,
}: {
  x: number;
  y: number;
  width: number;
  children: string;
  tone?: 'warm' | 'cool';
}) {
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - 13}
        width={width}
        height={26}
        rx={10}
        className={styles.glass}
      />
      <text x={x} y={y + 6} className={classNames(styles.label, tone && styles[tone])}>
        {children}
      </text>
    </g>
  );
}

// The problem's question, kept on screen from the scene that asks it. Its
// 4 格 is what the equation's right side comes from; the child taps it when
// the scene asks.
export function Question({ four }: { four?: 'tap' | 'lit' }) {
  const y = rows.question;
  const pill = (
    <>
      <rect x={430} y={y - 15} width={58} height={30} rx={10} className={styles.glass} />
      {four && <rect x={426} y={y - 19} width={66} height={38} rx={13} className={styles.halo} />}
      <text x={459} y={y + 7} className={classNames(styles.point, styles.warm)}>
        4 格
      </text>
    </>
  );
  return (
    <g>
      <rect x={160} y={y - 19} width={380} height={38} rx={14} className={styles.glass} />
      <text x={176} y={y + 7} className={classNames(styles.point, styles.start)}>
        题目：M、N 什么时候相距
      </text>
      {four === 'tap' ? (
        <Tappable part="four" label="题目里的 4 格">
          {pill}
        </Tappable>
      ) : (
        pill
      )}
      <text x={502} y={y + 7} className={styles.point}>
        ？
      </text>
    </g>
  );
}

// How long four squares are, beside the question.
export function FourSample() {
  const y = rows.question;
  return (
    <g>
      <rect x={556} y={y - 19} width={200} height={38} rx={14} className={styles.glass} />
      <Squares from={13.8} to={17.8} y={y} className={styles.gap} height={16} />
      <text x={712} y={y + 6} className={styles.label}>
        = 4 格
      </text>
    </g>
  );
}

// The first second of both cars side by side: two squares against one,
// and the one more the yellow car drove.
export function Compare() {
  const left = 300;
  const block = (x: number, y: number, className: string) => (
    <rect x={x} y={y} width={26} height={14} rx={4} className={className} />
  );
  return (
    <g>
      <rect x={left} y={306} width={232} height={68} rx={14} className={styles.glass} />
      <text x={left + 116} y={326} className={styles.label}>
        同样走一秒
      </text>
      <text x={left + 30} y={348} className={classNames(styles.label, styles.warm)}>
        黄车
      </text>
      <text x={left + 30} y={366} className={classNames(styles.label, styles.cool)}>
        蓝车
      </text>
      {block(left + 56, 336, styles.yellowBlock)}
      {block(left + 85, 336, styles.yellowBlock)}
      {block(left + 56, 354, styles.gap)}
      {block(left + 85, 354, styles.step)}
      <text x={left + 172} y={358} className={classNames(styles.label, styles.warm)}>
        多走一格
      </text>
    </g>
  );
}
