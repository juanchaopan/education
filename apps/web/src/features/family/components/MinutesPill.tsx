import { Icon } from '../../../shared/ui/Icon';
import { minutesOf } from './study-day-text';
import styles from './StudyFigures.module.css';

// The minutes studied over the days shown, or on one day, as a pill: a clock,
// the days, and the minutes in large figures.
export function MinutesPill({ days, seconds }: { days?: string; seconds: number }) {
  return (
    <p className={styles.minutes}>
      <Icon name="clock" className={styles.clock} />
      {days && <span>{days}</span>}
      <span>
        已学 <strong className={styles.figure}>{minutesOf(seconds)}</strong> 分钟
      </span>
    </p>
  );
}
