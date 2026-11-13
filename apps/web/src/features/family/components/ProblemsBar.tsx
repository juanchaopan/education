import type { ProblemCounts, ProblemState } from '@education/contracts';
import styles from './StudyFigures.module.css';

const parts: readonly (readonly [ProblemState, string])[] = [
  ['independent', '独立完成'],
  ['assisted', '提示后完成'],
  ['open', '还没做出来'],
];

// The problems of some days, each counted once: how many, then each state
// that has any, and a bar split by them in the same colours as the dots. The
// parts always add up to the whole. Each part keeps its words together, so a
// narrow line breaks between parts and never leaves 「道」 alone.
export function ProblemsBar({ counts, empty }: { counts: ProblemCounts; empty: string }) {
  const total = counts.independent + counts.assisted + counts.open;
  if (!total)
    return (
      <div className={styles.problems}>
        <p className={styles.line}>{empty}</p>
        <div className={styles.bar} aria-hidden="true" />
      </div>
    );
  const shown = parts.filter(([state]) => counts[state] > 0);
  return (
    <div className={styles.problems}>
      <p className={styles.line}>
        <span className={styles.part}>
          <strong className={styles.figure}>{total}</strong> 道题：
        </span>
        {shown.map(([state, label]) => (
          <span key={state} className={styles.part} data-state={state}>
            {label} {counts[state]} 道
          </span>
        ))}
      </p>
      <div className={styles.bar} aria-hidden="true">
        {shown.map(([state]) => (
          <span
            key={state}
            className={styles.segment}
            data-state={state}
            style={{ flexGrow: counts[state] }}
          />
        ))}
      </div>
    </div>
  );
}
