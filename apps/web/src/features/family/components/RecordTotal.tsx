import { durationName } from './study-day-text';
import styles from './LearningSummary.module.css';

// The whole record in one line: every problem ever tried, counted once, and
// all the time spent studying.
export function RecordTotal({ problems, seconds }: { problems: number; seconds: number }) {
  return (
    <p className={styles.total}>
      一共做过 <strong>{problems}</strong> 道题 · 学了 <strong>{durationName(seconds)}</strong>
    </p>
  );
}
