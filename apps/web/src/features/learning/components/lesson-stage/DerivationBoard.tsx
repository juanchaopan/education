import { classNames } from '../../../../shared/lib/class-names';
import styles from './DerivationBoard.module.css';

type Props = {
  // The board's top left corner on the stage's world, and its width.
  x: number;
  y: number;
  width: number;
  // The step the current one grew from, faded above it.
  before?: string;
  // The current step: one line, or a line for each case of it.
  now: readonly [string, ...string[]];
  // A short reading of the current step under it.
  note?: string;
  // The line of the current step the scene or a hint points at.
  lit?: number;
};

// The world's sizes of the board's writing and the space around it.
const sizes = { before: 16, now: 26, note: 15, pad: 14, gap: 8 };

// Where each line's baseline falls, from the board's top, and the board's
// height.
function lay(before: boolean, lines: number, note: boolean) {
  let y = sizes.pad;
  const step = (size: number) => {
    y += size;
    const baseline = y;
    y += sizes.gap;
    return baseline;
  };
  const beforeAt = before ? step(sizes.before) : undefined;
  const nowAt = Array.from({ length: lines }, () => step(sizes.now));
  const noteAt = note ? step(sizes.note) : undefined;
  return { beforeAt, nowAt, noteAt, height: y - sizes.gap + sizes.pad };
}

// 推导板: one board on the stage where a derivation grows step by step, so
// the steps stay in sight on one screen. The current step is written large,
// a line for each case once it splits; the step it grew from stays faded
// above it, and a short reading of it sits below. A new step fades in where
// it stays, and the line a hint points at is written in gold. Screen readers
// read the lines in order. The board is drawn in the lesson's world, where
// the lesson puts it, in the smoked glass of the stage's controls.
export function DerivationBoard({ x, y, width, before, now, note, lit }: Props) {
  const { beforeAt, nowAt, noteAt, height } = lay(before !== undefined, now.length, !!note);
  const middle = width / 2;
  return (
    <g className={styles.board} transform={`translate(${x} ${y})`} role="group" aria-label="推导">
      <rect className={styles.pane} width={width} height={height} rx={18} />
      {before !== undefined && (
        <text className={styles.before} x={middle} y={beforeAt} fontSize={sizes.before}>
          {before}
        </text>
      )}
      <g key={now.join('\n')} className={styles.now}>
        {now.map((line, index) => (
          <text
            key={line}
            className={classNames(styles.line, index === lit && styles.lit)}
            x={middle}
            y={nowAt[index]}
            fontSize={sizes.now}
          >
            {line}
          </text>
        ))}
      </g>
      {note && (
        <text className={styles.note} x={middle} y={noteAt} fontSize={sizes.note}>
          {note}
        </text>
      )}
    </g>
  );
}
